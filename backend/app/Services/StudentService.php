<?php
namespace App\Services;
use App\Models\Student;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class StudentService
{
    public function list(array $filters): LengthAwarePaginator { return Student::query()->when($filters['BranchId']??null,fn($q,$v)=>$q->where('BranchId',$v))->when($filters['Status']??null,fn($q,$v)=>$q->where('Status',$v))->when($filters['search']??null,fn($q,$v)=>$q->where(fn($x)=>$x->where('AdmissionNo','like',"%$v%")->orWhere('FirstName','like',"%$v%")->orWhere('LastName','like',"%$v%")))->orderByDesc('StudentId')->paginate(min((int)($filters['per_page']??15),100)); }
    public function create(array $data): Student { return Student::create($data); }
}
