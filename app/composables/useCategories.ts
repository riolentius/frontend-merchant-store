export interface CustomerCategory {
  id:          string
  code:        string   // REGULAR | SPECIAL | VIP
  name:        string   // Regular | Special | VIP
  description?: string
}
 
// Singleton state — fetched once, shared across all components
const categories    = ref<CustomerCategory[]>([])
const isLoaded      = ref(false)
const isLoading     = ref(false)
 
export const useCategories = () => {
  const { $api } = useNuxtApp()
 
  const fetchCategories = async () => {
    if (isLoaded.value || isLoading.value) return
    isLoading.value = true
    try {
      const res = await $api<{ items: CustomerCategory[] }>('/customer-categories')
      categories.value = res.items ?? []
      isLoaded.value   = true
    } catch (err) {
      console.error('Failed to load customer categories:', err)
    } finally {
      isLoading.value = false
    }
  }
 
  // id → name  (e.g. "f8dcecd8-..." → "Regular")
  const nameById = computed(() =>
    Object.fromEntries(categories.value.map(c => [c.id, c.name]))
  )
 
  // code → id  (e.g. "REGULAR" → "f8dcecd8-...")
  const idByCode = computed(() =>
    Object.fromEntries(categories.value.map(c => [c.code, c.id]))
  )
 
  // name → id  (e.g. "Regular" → "f8dcecd8-...")
  const idByName = computed(() =>
    Object.fromEntries(categories.value.map(c => [c.name, c.id]))
  )
 
  // id → code  (e.g. "f8dcecd8-..." → "REGULAR")
  const codeById = computed(() =>
    Object.fromEntries(categories.value.map(c => [c.id, c.code]))
  )
 
  // Get display name from a categoryId UUID
  const getCategoryName = (id?: string | null): string => {
    if (!id) return '—'
    return nameById.value[id] ?? '—'
  }
 
  // Get category UUID from display name
  const getCategoryId = (name: string): string | undefined => {
    return idByName.value[name]
  }
 
  // Get category UUID from code
  const getCategoryIdByCode = (code: string): string | undefined => {
    return idByCode.value[code]
  }
 
  return {
    categories,
    isLoading,
    isLoaded,
    fetchCategories,
    getCategoryName,
    getCategoryId,
    getCategoryIdByCode,
    nameById,
    idByCode,
    idByName,
    codeById,
  }
}