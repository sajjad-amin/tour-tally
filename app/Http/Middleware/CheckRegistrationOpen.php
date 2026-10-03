<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRegistrationOpen
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $isOpen = Setting::get('is_registration_open', true);

        if ($isOpen === false || $isOpen === 'false' || $isOpen === 0 || $isOpen === '0') {
            return response()->json([
                'message' => 'User registration is currently closed by the Server Administrator.',
                'registration_open' => false,
            ], 403);
        }

        return $next($request);
    }
}
