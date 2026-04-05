
export interface SkuUnit {
  code:        string 
  label:       string
  description: string
}
 
export const SKU_UNITS: SkuUnit[] = [
  { code: 'PCS',  label: 'PCS',   description: 'Per piece / unit' },
  { code: 'KG',   label: 'KG',    description: 'Per kilogram' },
  { code: 'GR',   label: 'GR',    description: 'Per gram' },
  { code: 'LTR',  label: 'LTR',   description: 'Per liter' },
  { code: 'ML',   label: 'ML',    description: 'Per milliliter' },
  { code: 'BOX',  label: 'BOX',   description: 'Per box' },
  { code: 'PACK', label: 'PACK',  description: 'Per pack / bundle' },
  { code: 'SAK',  label: 'SAK',   description: 'Per sack / karung' },
  { code: 'DUS',  label: 'DUS',   description: 'Per dus / carton' },
  { code: 'BTL',  label: 'BTL',   description: 'Per bottle' },
  { code: 'RLL',  label: 'RLL',   description: 'Per roll' },
  { code: 'MTR',  label: 'MTR',   description: 'Per meter' },
  { code: 'LBR',  label: 'LBR',   description: 'Per lembar / sheet' },
  { code: 'SET',  label: 'SET',   description: 'Per set' },
  { code: 'PSG',  label: 'PSG',   description: 'Per pasang / pair' },
]
 
// Quick lookup by code
export const SKU_UNIT_MAP = Object.fromEntries(
  SKU_UNITS.map(u => [u.code, u])
)
 