<script setup lang="ts">
import { USE_MOCK, mockLogin } from "../../mocks";

definePageMeta({
  layout: "auth",
  middleware: [],
});

const { login, setAuth, isAuthenticated } = useAuth();

if (isAuthenticated.value) {
  await navigateTo("/admin");
}

const form = reactive({ username: "", password: "" });
const isLoading = ref(false);
const errorMsg = ref("");
const showPassword = ref(false);

const handleLogin = async () => {
  errorMsg.value = "";

  if (!form.username.trim() || !form.password.trim()) {
    errorMsg.value = "Username and password are required.";
    return;
  }

  isLoading.value = true;

  try {
    if (USE_MOCK) {
      const result = await mockLogin(form.username, form.password);
      setAuth(result);
    } else {
      await login({ username: form.username, password: form.password });
    }
    await navigateTo("/admin");
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) errorMsg.value = "Invalid username or password.";
    else if (status === 400 || status === 422)
      errorMsg.value = "Invalid credentials format.";
    else if (status === 500) errorMsg.value = "Server error. Please try again.";
    else errorMsg.value = "Cannot connect to server.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-bg" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <pattern
            id="auth-dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#94a3b8" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-dots)" />
      </svg>
    </div>

    <div class="auth-card-wrap">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 10L8 15L17 5"
                stroke="white"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div>
            <p class="auth-brand-name">Merchant Store</p>
            <p class="auth-brand-sub">Admin Panel</p>
          </div>
        </div>

        <div class="auth-sep" />

        <div class="auth-head">
          <h1 class="auth-title">Sign in</h1>
          <p class="auth-desc">
            Enter your credentials to access the dashboard
          </p>
        </div>

        <div v-if="USE_MOCK" class="dev-hint">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Dev mode · <code>admin</code> / <code>admin123</code></span>
        </div>

        <form novalidate @submit.prevent="handleLogin">
          <div class="auth-fields">
            <div class="auth-field">
              <label for="username" class="auth-label">Username</label>
              <InputText
                id="username"
                v-model="form.username"
                placeholder="e.g. admin"
                :disabled="isLoading"
                autocomplete="username"
                fluid
                @keydown.enter="handleLogin"
              />
            </div>

            <div class="auth-field">
              <label for="password" class="auth-label">Password</label>
              <div class="auth-pw-wrap">
                <InputText
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  :disabled="isLoading"
                  autocomplete="current-password"
                  fluid
                  @keydown.enter="handleLogin"
                />
                <button
                  type="button"
                  class="auth-pw-toggle"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <svg
                    v-if="!showPassword"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg
                    v-else
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <Transition name="auth-err">
            <div v-if="errorMsg" class="auth-error" role="alert">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                style="flex-shrink: 0; margin-top: 1px"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ errorMsg }}
            </div>
          </Transition>

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="isLoading"
            fluid
            class="auth-submit-btn"
          >
            <template #default>
              <span class="auth-btn-inner">
                <template v-if="!isLoading">
                  Sign in
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </template>
                <template v-else>Authenticating…</template>
              </span>
            </template>
          </Button>
        </form>

        <p class="auth-foot">Golang Backend Platform · v1.0</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-btn-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dev-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  margin-bottom: 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 7px;
  font-size: 12.5px;
  color: #92400e;
}
.dev-hint code {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  background: #fef3c7;
  padding: 1px 5px;
  border-radius: 4px;
  color: #78350f;
}
</style>
