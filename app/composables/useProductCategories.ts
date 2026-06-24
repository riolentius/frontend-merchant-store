export interface ProductCategory {
  id:   string
  name: string
}

const categories = ref<ProductCategory[]>([])
const isLoaded = ref(false)
const isLoading = ref(false)

export const useProductCategories = () => {
  const { apiFetch } = useApiFetch()

  const normalize = (name: string) => name.trim().toUpperCase().replace(/\s+/g, " ")

  const fetchProductCategories = async () => {
    if (isLoaded.value || isLoading.value) return
    isLoading.value = true
    try {
      const res = await apiFetch<{ items: ProductCategory[] }>("/product-categories")
      categories.value = res.items ?? []
      isLoaded.value = true
    } catch (err) {
      console.error("Failed to load product categories:", err)
    } finally {
      isLoading.value = false
    }
  }

  const createProductCategory = async (rawName: string): Promise<ProductCategory> => {
    const name = normalize(rawName)
    const existing = categories.value.find((c) => c.name === name)
    if (existing) return existing

    const created = await apiFetch<ProductCategory>("/product-categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    categories.value.push(created)
    return created
  }

  return { categories, isLoading, isLoaded, fetchProductCategories, createProductCategory, normalize }
}