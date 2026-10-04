<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * TinyPOS Thermal Printer Bridge Integration Service.
 *
 * Provides a unified interface for interacting with the
 * TinyPOS Thermal Printer Bridge (Direct Bluetooth & Cloud Relay modes).
 */
class TinyPosService
{
    /**
     * Get the configured TinyPOS API Key (from database Setting or .env fallback).
     */
    public function getApiKey(): ?string
    {
        return Setting::get('tinypos_api_key', config('services.tinypos.api_key'));
    }

    /**
     * Get the configured TinyPOS Base URL.
     */
    public function getBaseUrl(): string
    {
        return rtrim(Setting::get('tinypos_base_url', config('services.tinypos.base_url', '')), '/');
    }

    /**
     * Check whether TinyPOS is configured with an API key.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->getApiKey());
    }

    /**
     * Send raw PDF bytes directly to TinyPOS thermal printer.
     *
     * @param  string  $fileBytes  Binary content of PDF
     * @param  string  $filename  Filename for attachment
     * @param  array<string, mixed>  $options  Print parameters (strength, scale, autocrop, etc.)
     * @return array<string, mixed>
     */
    public function printRaw(string $fileBytes, string $filename = 'receipt.pdf', array $options = []): array
    {
        if (! $this->isConfigured()) {
            return [
                'status' => 'error',
                'status_code' => 422,
                'message' => 'TinyPOS API key is not configured. Please set TINYPOS_API_KEY in your .env file or Settings.',
            ];
        }

        $apiKey = $this->getApiKey();
        $baseUrl = $this->getBaseUrl();

        $scale = (string) ($options['scale'] ?? '1.0');
        $strength = (string) ($options['strength'] ?? '4');
        $mode = (string) ($options['mode'] ?? 'text');
        $autocrop = isset($options['autocrop'])
            ? (is_bool($options['autocrop']) ? ($options['autocrop'] ? 'true' : 'false') : (string) $options['autocrop'])
            : 'true';
        $keepjob = isset($options['keepjob'])
            ? (is_bool($options['keepjob']) ? ($options['keepjob'] ? 'true' : 'false') : (string) $options['keepjob'])
            : 'false';
        $immediate = isset($options['immediate'])
            ? (is_bool($options['immediate']) ? ($options['immediate'] ? 'true' : 'false') : (string) $options['immediate'])
            : 'true';

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Accept' => 'application/json',
            ])->timeout(30)->attach(
                'file',
                $fileBytes,
                $filename
            )->post("{$baseUrl}/api/print/raw", [
                'immediate' => $immediate,
                'scale' => $scale,
                'autocrop' => $autocrop,
                'strength' => $strength,
                'mode' => $mode,
                'keepjob' => $keepjob,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info("TinyPOS printRaw dispatched for {$filename}", [
                    'job_id' => $data['job_id'] ?? null,
                    'options' => $options,
                ]);

                return [
                    'status' => 'success',
                    'status_code' => 200,
                    'message' => 'Receipt sent to thermal printer successfully!',
                    'job_id' => $data['job_id'] ?? null,
                    'data' => $data,
                ];
            }

            Log::error("TinyPOS printRaw rejected for {$filename}", [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            $errorMsg = $response->json('detail') ?? $response->json('message') ?? 'Printer rejected the print request.';

            return [
                'status' => 'error',
                'status_code' => $response->status() >= 400 && $response->status() < 500 ? 400 : 502,
                'message' => is_string($errorMsg) ? $errorMsg : json_encode($errorMsg),
                'gateway_response' => $response->json(),
            ];
        } catch (\Throwable $e) {
            Log::error("TinyPOS printRaw exception for {$filename}: ".$e->getMessage());

            return [
                'status' => 'error',
                'status_code' => 500,
                'message' => 'Could not connect to TinyPOS printer bridge: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Check hardware status of TinyPOS thermal printer.
     *
     * @return array<string, mixed>
     */
    public function getStatus(): array
    {
        if (! $this->isConfigured()) {
            return [
                'status' => 'unconfigured',
                'connected' => false,
                'message' => 'TinyPOS API key is not configured.',
            ];
        }

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->getApiKey(),
                'Accept' => 'application/json',
            ])->timeout(10)->get("{$this->getBaseUrl()}/api/status");

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'status' => 'error',
                'connected' => false,
                'message' => 'Failed to reach thermal printer bridge.',
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'offline',
                'connected' => false,
                'message' => 'Printer bridge is unreachable: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Stop active thermal print job or cancel a queued job.
     *
     * @return array<string, mixed>
     */
    public function stopJob(?string $jobId = null): array
    {
        if (! $this->isConfigured()) {
            return [
                'status' => 'error',
                'status_code' => 422,
                'message' => 'TinyPOS API key is not configured.',
            ];
        }

        $apiKey = $this->getApiKey();
        $baseUrl = $this->getBaseUrl();

        try {
            if (! empty($jobId)) {
                $cancelRes = Http::withHeaders([
                    'X-API-Key' => $apiKey,
                    'Accept' => 'application/json',
                ])->timeout(10)->post("{$baseUrl}/api/print/cancel/{$jobId}");

                if ($cancelRes->successful()) {
                    Log::info("TinyPOS print job stopped by ID {$jobId}", ['response' => $cancelRes->json()]);

                    return [
                        'status' => 'success',
                        'status_code' => 200,
                        'message' => 'Print job stopped and aborted successfully.',
                        'job_id' => $jobId,
                        'details' => $cancelRes->json(),
                    ];
                }
            }

            // Fallback: Immediate stop of currently transmitting job
            $stopRes = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Accept' => 'application/json',
            ])->timeout(10)->post("{$baseUrl}/api/print/stop");

            if ($stopRes->successful()) {
                Log::info('TinyPOS active printing stopped immediately', ['response' => $stopRes->json()]);

                return [
                    'status' => 'success',
                    'status_code' => 200,
                    'message' => 'Active thermal printing stopped immediately.',
                    'details' => $stopRes->json(),
                ];
            }

            return [
                'status' => 'error',
                'status_code' => $stopRes->status(),
                'message' => $stopRes->json('message') ?? 'Printer rejected stop request.',
            ];
        } catch (\Throwable $e) {
            Log::error('TinyPOS stopJob exception: '.$e->getMessage());

            return [
                'status' => 'error',
                'status_code' => 500,
                'message' => 'Could not send stop command to printer bridge: '.$e->getMessage(),
            ];
        }
    }
}
