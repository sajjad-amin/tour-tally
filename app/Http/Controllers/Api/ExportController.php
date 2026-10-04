<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Models\TourMember;
use App\Models\User;
use App\Services\SettlementService;
use App\Services\TinyPosService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Mccarlosen\LaravelMpdf\Facades\LaravelMpdf as Pdf;

class ExportController extends Controller
{
    public function __construct(
        protected SettlementService $settlementService,
        protected TinyPosService $tinyPosService
    ) {}

    /**
     * Authorize that the current authenticated user is an active member or Server Admin.
     */
    protected function authorizeTourMember(User $user, Tour $tour): void
    {
        if ($user->hasRole('Server Admin') || $tour->isJoinedMember($user)) {
            return;
        }

        abort(response()->json([
            'message' => 'You must be an active member of this tour to access its exports.',
        ], 403));
    }

    /**
     * Export emoji-rich WhatsApp/Messenger friendly settlement statement as plain text.
     */
    public function exportText(Request $request, Tour $tour): JsonResponse
    {
        $this->authorizeTourMember($request->user(), $tour);

        $settlement = $this->settlementService->calculate($tour);
        $text = $this->settlementService->formatStatementText($settlement);

        return response()->json([
            'text' => $text,
            'tour_id' => $tour->id,
            'tour_name' => $tour->name,
        ]);
    }

    /**
     * Export full tour settlement summary as an A4 PDF document.
     */
    public function exportGroupPdf(Request $request, Tour $tour): Response
    {
        $this->authorizeTourMember($request->user(), $tour);

        $settlement = $this->settlementService->calculate($tour);
        $generatedAt = Carbon::now()->format('d M Y, h:i A');

        $data = [
            'tour' => $tour,
            'settlement' => $settlement,
            'generatedAt' => $generatedAt,
        ];

        $pdf = Pdf::loadView('pdf.group_summary', $data, [], [
            'format' => 'A4',
            'margin_left' => 10,
            'margin_right' => 10,
            'margin_top' => 12,
            'margin_bottom' => 12,
        ]);

        $safeTourName = Str::slug($tour->name) ?: 'tour';
        $filename = "settlement-summary-{$safeTourName}.pdf";
        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "{$disposition}; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Export 58mm thermal POS receipt for a specific member, or direct-print via TinyPOS.
     */
    public function exportPosReceipt(Request $request, Tour $tour, string $memberId): Response|JsonResponse
    {
        $this->authorizeTourMember($request->user(), $tour);

        // Resolve member user by User ID or TourMember record ID
        $memberUser = User::where('id', $memberId)
            ->orWhereIn('id', function ($query) use ($tour, $memberId) {
                $query->select('user_id')
                    ->from('tour_members')
                    ->where('tour_id', $tour->id)
                    ->where('id', $memberId);
            })
            ->first();

        if (! $memberUser) {
            return response()->json([
                'message' => 'Member not found in this tour.',
            ], 404);
        }

        // Verify member belongs to this tour
        $isMember = TourMember::where('tour_id', $tour->id)
            ->where('user_id', $memberUser->id)
            ->where('status', 'joined')
            ->exists();

        if (! $isMember && $tour->created_by !== $memberUser->id) {
            return response()->json([
                'message' => 'User is not a joined member of this tour.',
            ], 404);
        }

        $settlement = $this->settlementService->calculate($tour);
        $balance = $settlement['balances_by_user_id'][$memberUser->id] ?? [
            'user' => [
                'id' => $memberUser->id,
                'name' => $memberUser->name,
                'email' => $memberUser->email,
                'avatar' => $memberUser->avatar,
                'phone' => $memberUser->phone,
            ],
            'total_paid' => 0.00,
            'total_owed' => 0.00,
            'net_balance' => 0.00,
            'status' => 'settled',
        ];

        // Filter suggested transactions involving this specific member
        $actions = [];
        if ($balance['status'] === 'debt') {
            $actions = array_values(array_filter(
                $settlement['suggested_transactions'],
                fn ($t) => $t['from']['id'] === $memberUser->id
            ));
        } elseif ($balance['status'] === 'credit') {
            $actions = array_values(array_filter(
                $settlement['suggested_transactions'],
                fn ($t) => $t['to']['id'] === $memberUser->id
            ));
        }

        $data = [
            'tour' => $tour,
            'user' => $memberUser,
            'balance' => $balance,
            'actions' => $actions,
            'settlement' => $settlement,
            'generatedAt' => Carbon::now()->format('d M Y, h:i A'),
        ];

        $pdf = $this->generatePosPdf($data);

        // Direct thermal print via TinyPOS if requested
        if ($request->boolean('print') || $request->isMethod('POST')) {
            $safeMemberName = Str::slug($memberUser->name) ?: 'member';
            $jobName = "pos-{$tour->id}-{$safeMemberName}.pdf";

            $printResult = $this->tinyPosService->printRaw(
                $pdf->output(),
                $jobName,
                $request->only(['strength', 'scale', 'autocrop', 'keepjob', 'immediate'])
            );

            return response()->json($printResult, $printResult['status_code'] ?? 200);
        }

        $filename = "receipt-{$memberUser->id}.pdf";
        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "{$disposition}; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Generate 58mm continuous thermal receipt mPDF with binary height search.
     *
     * @param  array<string, mixed>  $data
     */
    protected function generatePosPdf(array $data)
    {
        $paperWidthMm = 58;
        $low = 80;
        $high = 180;
        $maxMm = 4000;

        // Step 1: Expand upper bound until the content fits on 1 page
        while (true) {
            $probe = Pdf::loadView('pdf.pos_receipt', $data, [], [
                'format' => [$paperWidthMm, $high],
                'default_font' => 'solaimanlipi',
                'margin_left' => 2,
                'margin_right' => 2,
                'margin_top' => 2,
                'margin_bottom' => 2,
            ]);

            $pages = $probe->getMpdf()->page;
            if ($pages > 1 && $high < $maxMm) {
                $low = $high;
                $high += 80;

                continue;
            }
            break;
        }

        // Step 2: Binary search to find optimal height
        for ($i = 0; $i < 8; $i++) {
            $mid = ($low + $high) / 2;
            $test = Pdf::loadView('pdf.pos_receipt', $data, [], [
                'format' => [$paperWidthMm, $mid],
                'default_font' => 'solaimanlipi',
                'margin_left' => 2,
                'margin_right' => 2,
                'margin_top' => 2,
                'margin_bottom' => 2,
            ]);

            if ($test->getMpdf()->page > 1) {
                $low = $mid;
            } else {
                $high = $mid;
            }
        }

        $finalHeightMm = ceil($high) + 2;

        return Pdf::loadView('pdf.pos_receipt', $data, [], [
            'format' => [$paperWidthMm, $finalHeightMm],
            'default_font' => 'solaimanlipi',
            'margin_left' => 2,
            'margin_right' => 2,
            'margin_top' => 2,
            'margin_bottom' => 2,
        ]);
    }

    /**
     * Probe TinyPOS thermal printer status.
     */
    public function getPrinterStatus(): JsonResponse
    {
        return response()->json($this->tinyPosService->getStatus());
    }

    /**
     * Stop active thermal print job.
     */
    public function stopPrintJob(Request $request): JsonResponse
    {
        $result = $this->tinyPosService->stopJob($request->input('job_id'));

        return response()->json($result, $result['status_code'] ?? 200);
    }
}
