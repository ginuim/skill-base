import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import './assets/main.css'
import 'diff2html/bundles/css/diff2html.min.css'
import { initTheme } from './theme'

initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
