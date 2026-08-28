<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $service) {}

    public function store(Request $request)
    {
        $data = $request->validate(['InvoiceId' => ['required', 'integer'], 'AccountId' => ['required', 'integer'], 'IdempotencyKey' => ['required', 'uuid'], 'Amount' => ['required', 'numeric', 'gt:0'], 'Method' => ['required', Rule::in(['Cash', 'Bank', 'Mobile money', 'Account transfer', 'Other'])]]);

        return response()->json(['success' => true, 'message' => 'Payment posted successfully.', 'data' => $this->service->post($data), 'meta' => (object) []], 201);
    }
}
