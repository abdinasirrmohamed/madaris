<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcademicResourceRequest;
use App\Services\AcademicService;
use App\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicController extends Controller
{
    public function __construct(private AcademicService $service) {}

    public function index(Request $request, string $resource)
    {
        return $this->ok($this->service->list($resource, $request->only('BranchId')), 'Academic records retrieved.');
    }

    public function store(AcademicResourceRequest $request, string $resource)
    {
        return $this->ok($this->service->create($resource, $request->validated()), 'Academic record created.', 201);
    }

    public function update(AcademicResourceRequest $request, string $resource, int $id)
    {
        return $this->ok($this->service->update($resource, $id, $request->validated()), 'Academic record updated.');
    }

    public function destroy(string $resource, int $id)
    {
        $this->service->delete($resource, $id);

        return $this->ok((object) [], 'Academic record deleted.');
    }

    public function teachers(TenantContext $tenant)
    {
        return $this->ok(DB::table('Users')->where('TenantId', $tenant->id())->where('Status', 'Active')->select('UserId', 'Name', 'Email')->orderBy('Name')->get(), 'Teacher references retrieved.');
    }

    private function ok(mixed $data, string $message, int $status = 200)
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) []], $status);
    }
}
