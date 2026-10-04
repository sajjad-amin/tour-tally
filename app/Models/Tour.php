<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tour extends Model
{
    use HasFactory, HasUuids;

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
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'destination',
        'description',
        'start_date',
        'end_date',
        'status',
        'created_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
        ];
    }

    /**
     * The creator of the tour.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The members associated with this tour through tour_members.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tour_members')
            ->withPivot(['id', 'role', 'status'])
            ->withTimestamps();
    }

    /**
     * Direct relationship to tour_members pivot table.
     */
    public function tourMembers(): HasMany
    {
        return $this->hasMany(TourMember::class, 'tour_id');
    }

    /**
     * Check if a given user is a Tour Admin for this tour.
     */
    public function isTourAdmin(User|string $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        if ($this->created_by === $userId) {
            return true;
        }

        return $this->tourMembers()
            ->where('user_id', $userId)
            ->where('role', 'admin')
            ->where('status', 'joined')
            ->exists();
    }

    /**
     * Check if a given user is part of this tour (either joined or invited).
     */
    public function hasMember(User|string $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        if ($this->created_by === $userId) {
            return true;
        }

        return $this->tourMembers()
            ->where('user_id', $userId)
            ->exists();
    }

    /**
     * Check if a given user is an active joined member (or creator) of this tour.
     */
    public function isJoinedMember(User|string $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        if ($this->created_by === $userId) {
            return true;
        }

        return $this->tourMembers()
            ->where('user_id', $userId)
            ->where('status', 'joined')
            ->exists();
    }

    /**
     * Expenses logged for this tour.
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'tour_id');
    }
}
