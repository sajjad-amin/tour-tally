<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsServerAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->hasRole('Server Admin') && $user->role !== 'admin')) {
            return response()->json([
                'message' => 'Unauthorized. Server Admin privileges are required to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
