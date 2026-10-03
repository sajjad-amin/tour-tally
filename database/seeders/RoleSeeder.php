<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create Spatie roles
        $adminRole = Role::firstOrCreate([
            'name' => 'Server Admin',
            'guard_name' => 'web',
        ]);

        $userRole = Role::firstOrCreate([
            'name' => 'User',
            'guard_name' => 'web',
        ]);

        // 2. Create Default Server Admin user
        $admin = User::where('email', 'admin')
            ->orWhere('email', 'admin@tourtally.org')
            ->first();

        if ($admin) {
            $admin->update([
                'name' => 'Server Admin',
                'email' => 'admin',
                'password' => 'password',
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);
        } else {
            $admin = User::create([
                'name' => 'Server Admin',
                'email' => 'admin',
                'password' => 'password',
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);
        }

        $admin->syncRoles([$adminRole]);

        // 3. Set global settings
        Setting::set('is_registration_open', true);
    }
}
