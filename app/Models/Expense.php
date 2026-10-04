<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Expense extends Model
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
        'tour_id',
        'added_by',
        'amount',
        'category',
        'title',
        'notes',
        'date',
        'status',
        'proposed_changes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date' => 'date:Y-m-d',
            'proposed_changes' => 'array',
        ];
    }

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'added_by_id',
    ];

    /**
     * Get the author user ID string.
     */
    public function getAddedByIdAttribute(): ?string
    {
        return $this->attributes['added_by'] ?? null;
    }

    /**
     * The tour this expense belongs to.
     */
    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class, 'tour_id');
    }

    /**
     * The user who added/logged this expense entry.
     */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    /**
     * The payment allocations for this expense.
     */
    public function payers(): HasMany
    {
        return $this->hasMany(ExpensePayer::class, 'expense_id');
    }

    /**
     * The splits associated with this expense.
     */
    public function splits(): HasMany
    {
        return $this->hasMany(ExpenseSplit::class, 'expense_id');
    }
}
