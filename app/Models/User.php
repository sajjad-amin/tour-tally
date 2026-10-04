<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'role', 'phone', 'avatar', 'google_id', 'metadata', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, Notifiable;

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'metadata' => 'array',
        ];
    }

    /**
     * Get phone number from metadata or column.
     */
    public function getPhoneAttribute(?string $value): ?string
    {
        return $this->metadata['phone'] ?? $value;
    }

    /**
     * Get WhatsApp link from metadata.
     */
    public function getWhatsappLinkAttribute(): ?string
    {
        return $this->metadata['whatsapp_link'] ?? null;
    }

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = ['has_password', 'has_google'];

    /**
     * Determine if the user has an explicit password configured.
     */
    public function getHasPasswordAttribute(): bool
    {
        return ! empty($this->password);
    }

    /**
     * Determine if the user account is linked to Google OAuth.
     */
    public function getHasGoogleAttribute(): bool
    {
        return ! empty($this->google_id);
    }

    /**
     * Get Messenger link from metadata.
     */
    public function getMessengerLinkAttribute(): ?string
    {
        return $this->metadata['messenger_link'] ?? null;
    }

    /**
     * The tours created by this user.
     */
    public function createdTours(): HasMany
    {
        return $this->hasMany(Tour::class, 'created_by');
    }

    /**
     * The tours this user belongs to as a member.
     */
    public function tours(): BelongsToMany
    {
        return $this->belongsToMany(Tour::class, 'tour_members')
            ->withPivot(['id', 'role', 'status'])
            ->withTimestamps();
    }

    /**
     * Direct relationship to tour_members entries for this user.
     */
    public function tourMemberships(): HasMany
    {
        return $this->hasMany(TourMember::class, 'user_id');
    }

    /**
     * Expense payer records for this user.
     */
    public function expensePayers(): HasMany
    {
        return $this->hasMany(ExpensePayer::class, 'user_id');
    }

    /**
     * Expenses paid by this user via expense_payers pivot.
     */
    public function expensesPaid(): BelongsToMany
    {
        return $this->belongsToMany(Expense::class, 'expense_payers', 'user_id', 'expense_id')
            ->withPivot('amount')
            ->withTimestamps();
    }

    /**
     * Expenses logged/added by this user.
     */
    public function expensesAdded(): HasMany
    {
        return $this->hasMany(Expense::class, 'added_by');
    }

    /**
     * Splits owed by this user.
     */
    public function expenseSplits(): HasMany
    {
        return $this->hasMany(ExpenseSplit::class, 'user_id');
    }
}
