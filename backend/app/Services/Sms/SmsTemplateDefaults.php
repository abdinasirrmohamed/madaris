<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\DB;

class SmsTemplateDefaults
{
    public static function ensure(int $tenantId, ?int $userId = null): void
    {
        DB::table('SmsTemplates')->where('TenantId', $tenantId)->where('TemplateType', 'fee_reminder')->update(['IsDefault' => false]);
        $rows = [
            [
                'TemplateName' => 'Ogeysiiska lacagta bisha',
                'TemplateType' => 'fee_reminder',
                'IsDefault' => true,
                'TemplateBody' => "OGEYSIISKA LACAGTA BISHA\nWaalid/Masuul {parent_name}, waxaan ku wargelinaynaa in lacagta waxbarashada ee bisha {month} ee ardayga {student_name} ay tahay \${total_fee}. Fadlan lacagta ku bixi waqtigeeda si loo sii wado adeegga waxbarashada. Mahadsanidiin.\n{school_name}\nMaamulka Dugsiga",
            ],
            [
                'TemplateName' => 'Lacagta dhiman',
                'TemplateType' => 'fee_reminder',
                'IsDefault' => false,
                'TemplateBody' => 'OGEYSIIS: Waalid/Masuul {parent_name}, {student_name} waxaa ka dhiman ${remaining_amount} oo ah lacagta waxbarashada ee bisha {month}. Fadlan ku bixi waqtigeeda. Mahadsanid. {school_name}',
            ],
            ['TemplateName' => 'Xaqiijinta lacag-bixinta', 'TemplateType' => 'payment_received', 'IsDefault' => true, 'TemplateBody' => 'Mudane/Marwo {parent_name}, waxaan xaqiijinay inaan ka guddoonnay {paid_amount}, oo ah lacagta ardayga {student_name}. Hadhaaga waa {amount_due}. Mahadsanid — {school_name}.'],
        ];
        foreach ($rows as $row) {
            DB::table('SmsTemplates')->updateOrInsert(['TenantId' => $tenantId, 'TemplateName' => $row['TemplateName']], ['TemplateType' => $row['TemplateType'], 'Language' => 'so', 'TemplateBody' => $row['TemplateBody'], 'IsActive' => true, 'IsDefault' => $row['IsDefault'], 'CreatedByUserId' => $userId, 'CreatedAt' => now(), 'UpdatedAt' => now()]);
        }
    }
}
