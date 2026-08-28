<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class LoginRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['Email'=>['required','email'],'Password'=>['required','string'],'DeviceName'=>['nullable','string','max:100']]; } }
