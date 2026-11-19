import type { CapacitorConfig } from '@capacitor/cli'

// Endereço do servidor real (API + site). Troque por uma URL pública quando
// hospedar o backend, ou defina CAPACITOR_SERVER_URL na hora do build.
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'http://192.168.178.129:3000/app'

const config: CapacitorConfig = {
  appId: 'com.pedeaqui.app',
  appName: 'Pede Aqui',
  webDir: 'dist',
  server: {
    url: serverUrl,
    cleartext: true,
    allowNavigation: [new URL(serverUrl).host],
  },
  android: {
    allowMixedContent: true,
  },
}

export default config
