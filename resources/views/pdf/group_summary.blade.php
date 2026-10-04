<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="utf-8">
    <title>{{ $tour->name }} - Settlement Summary</title>
    <style>
        @page {
            margin: 12mm 12mm 15mm 12mm;
            @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 8pt;
                color: #555555;
            }
        }

        * {
            box-sizing: border-box;
            font-family: 'solaimanlipi', 'DejaVu Sans', sans-serif;
            color: #111111;
        }

        body {
            font-family: 'solaimanlipi', 'DejaVu Sans', sans-serif;
            font-size: 9pt;
            line-height: 1.35;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #111111;
        }

        /* ── Header ────────────────────────────────────────────── */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #111111;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }

        .brand-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 2px 0;
            color: #111111;
        }

        .brand-subtitle {
            font-size: 8.5pt;
            color: #444444;
            margin: 0;
        }

        .statement-title-box {
            text-align: right;
            vertical-align: top;
        }

        .statement-badge {
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
            color: #111111;
        }

        .statement-meta {
            font-size: 8pt;
            color: #555555;
            margin-top: 3px;
        }

        /* ── KPI Summary Cards ────────────────────────────────── */
        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }

        .kpi-card {
            width: 33.33%;
            padding: 8px 10px;
            border: 1px solid #222222;
            background-color: #fcfcfc;
            text-align: center;
            vertical-align: middle;
        }

        .kpi-title {
            font-size: 7.5pt;
            text-transform: uppercase;
            color: #555555;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }

        .kpi-value {
            font-size: 13pt;
            font-weight: bold;
            color: #111111;
        }

        /* ── Section Title ────────────────────────────────────── */
        .section-title {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #111111;
            border-bottom: 1px solid #111111;
            padding-bottom: 3px;
            margin: 14px 0 8px 0;
        }

        /* ── Data Tables ──────────────────────────────────────── */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-bottom: 14px;
        }

        .data-table th {
            background-color: #f2f2f2;
            color: #111111;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 7.5pt;
            letter-spacing: 0.3px;
            border: 1px solid #cccccc;
            padding: 6px 8px;
            text-align: left;
        }

        .data-table td {
            border: 1px solid #e0e0e0;
            padding: 5px 8px;
            vertical-align: middle;
        }

        .data-table tr:nth-child(even) td {
            background-color: #fafafa;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .font-mono {
            font-family: 'DejaVu Sans Mono', monospace;
            font-size: 8pt;
        }

        .badge-status {
            display: inline-block;
            padding: 2px 6px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            border-radius: 2px;
            border: 1px solid #999999;
        }

        .badge-credit {
            background-color: #f0fdf4;
            color: #166534;
            border-color: #86efac;
        }

        .badge-debt {
            background-color: #fef2f2;
            color: #991b1b;
            border-color: #fca5a5;
        }

        .badge-settled {
            background-color: #f3f4f6;
            color: #374151;
            border-color: #d1d5db;
        }

        /* ── Footer ────────────────────────────────────────────── */
        .report-footer {
            margin-top: 20px;
            border-top: 1px solid #dddddd;
            padding-top: 6px;
            font-size: 7.5pt;
            color: #777777;
            text-align: center;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="vertical-align: top; width: 60%;">
                <div class="brand-title">{{ $tour->name }}</div>
                <div class="brand-subtitle">
                    @if($tour->destination)
                        📍 {{ $tour->destination }} &nbsp;|&nbsp;
                    @endif
                    📅 {{ $tour->start_date ? \Carbon\Carbon::parse($tour->start_date)->format('d M Y') : 'N/A' }}
                    @if($tour->end_date)
                        - {{ \Carbon\Carbon::parse($tour->end_date)->format('d M Y') }}
                    @endif
                    &nbsp;|&nbsp; Status: {{ ucfirst($tour->status ?? 'Active') }}
                </div>
            </td>
            <td class="statement-title-box" style="width: 40%;">
                <div class="statement-badge">TOUR SETTLEMENT SUMMARY</div>
                <div class="statement-meta">Generated: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <!-- Strict Summary KPI Cards -->
    <table class="kpi-table" cellpadding="0" cellspacing="0">
        <tr>
            <td class="kpi-card">
                <div class="kpi-title">TOTAL EXPENSES</div>
                <div class="kpi-value">{{ number_format($settlement['total_approved_expenses'], 2) }}</div>
            </td>
            <td class="kpi-card">
                <div class="kpi-title">APPROVED EXPENSES</div>
                <div class="kpi-value">{{ $settlement['approved_expenses_count'] }}</div>
            </td>
            <td class="kpi-card">
                <div class="kpi-title">SUGGESTED TRANSFERS</div>
                <div class="kpi-value">{{ count($settlement['suggested_transactions']) }}</div>
            </td>
        </tr>
    </table>

    <!-- Member Net Balances Ledger -->
    <div class="section-title">MEMBER NET BALANCES LEDGER</div>
    <table class="data-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th style="width: 32%;">Member</th>
                <th style="width: 17%;" class="text-right">Total Paid</th>
                <th style="width: 17%;" class="text-right">Total Owed</th>
                <th style="width: 18%;" class="text-right">Net Balance</th>
                <th style="width: 16%;" class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($settlement['member_balances'] as $mb)
                @php
                    $net = $mb['net_balance'];
                    $netFormatted = number_format(abs($net), 2);
                @endphp
                <tr>
                    <td>
                        <strong>{{ $mb['user']['name'] }}</strong>
                        @if(!empty($mb['user']['email']))
                            <br><span style="font-size: 7.2pt; color: #666666;">{{ $mb['user']['email'] }}</span>
                        @endif
                    </td>
                    <td class="text-right font-mono">{{ number_format($mb['total_paid'], 2) }}</td>
                    <td class="text-right font-mono">{{ number_format($mb['total_owed'], 2) }}</td>
                    <td class="text-right font-mono" style="font-weight: bold;">
                        @if($net > 0.009)
                            +{{ $netFormatted }}
                        @elseif($net < -0.009)
                            -{{ $netFormatted }}
                        @else
                            0.00
                        @endif
                    </td>
                    <td class="text-center">
                        @if($mb['status'] === 'credit')
                            <span class="badge-status badge-credit">RECEIVES</span>
                        @elseif($mb['status'] === 'debt')
                            <span class="badge-status badge-debt">OWES</span>
                        @else
                            <span class="badge-status badge-settled">SETTLED</span>
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center" style="padding: 15px; color: #777777;">
                        No members found in this tour.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Suggested Settlement Transfers -->
    <div class="section-title">SUGGESTED SETTLEMENT TRANSFERS (MINIMIZED)</div>
    <table class="data-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th style="width: 8%;" class="text-center">#</th>
                <th style="width: 36%;">From (Debtor)</th>
                <th style="width: 36%;">To (Creditor)</th>
                <th style="width: 20%;" class="text-right">Transfer Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse($settlement['suggested_transactions'] as $idx => $txn)
                <tr>
                    <td class="text-center font-mono">{{ $idx + 1 }}</td>
                    <td>
                        <strong>{{ $txn['from']['name'] }}</strong>
                        @if(!empty($txn['from']['email']))
                            <br><span style="font-size: 7.2pt; color: #666666;">{{ $txn['from']['email'] }}</span>
                        @endif
                    </td>
                    <td>
                        <strong>{{ $txn['to']['name'] }}</strong>
                        @if(!empty($txn['to']['email']))
                            <br><span style="font-size: 7.2pt; color: #666666;">{{ $txn['to']['email'] }}</span>
                        @endif
                    </td>
                    <td class="text-right font-mono" style="font-weight: bold; font-size: 9pt;">
                        {{ $txn['amount_formatted'] }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="text-center" style="padding: 15px; color: #555555;">
                        ✅ All accounts are completely settled. No transfers are required!
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Notes & Footer -->
    <div class="report-footer">
        This settlement statement is calculated based exclusively on approved tour expenses using TourTally's debt minimization algorithm.
        <br>
        Generated automatically by TourTally on {{ $generatedAt }}.
    </div>

</body>
</html>
