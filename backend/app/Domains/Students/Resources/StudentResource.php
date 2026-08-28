<?php

namespace App\Domains\Students\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['StudentId' => $this->StudentId, 'BranchId' => $this->BranchId, 'AdmissionNo' => $this->AdmissionNo, 'FirstName' => $this->FirstName, 'MiddleName' => $this->MiddleName, 'LastName' => $this->LastName, 'Gender' => $this->Gender, 'DateOfBirth' => $this->DateOfBirth, 'Phone' => $this->Phone, 'Address' => $this->Address, 'AdmissionDate' => $this->AdmissionDate, 'HealthNotes' => $this->HealthNotes, 'WelfareStatus' => $this->WelfareStatus, 'Status' => $this->Status, 'Version' => $this->Version, 'CreatedAt' => $this->CreatedAt, 'UpdatedAt' => $this->UpdatedAt];
    }
}
