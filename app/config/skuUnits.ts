
export interface SkuUnit {
  code:        string 
  label:       string
  description: string
}
 
export const SKU_UNITS: SkuUnit[] = [
  { code: 'PCS',  label: 'PCS',   description: 'Per piece / unit' },
  { code: 'BOX',  label: 'BOX',   description: 'Per box' },
  { code: 'PACK', label: 'PACK',  description: 'Per pack / bundle' },
  { code: 'DUS',  label: 'DUS',   description: 'Per dus / carton' },
  { code: 'SET',  label: 'SET',   description: 'Per set' },
  { code: 'GROSS',  label: 'GROSS',   description: 'Per gross' },
  { code: '1/2 GROSS',  label: '1/2 GROSS',   description: 'Per setengah gross' },

]
 
// Quick lookup by code
export const SKU_UNIT_MAP = Object.fromEntries(
  SKU_UNITS.map(u => [u.code, u])
)
 