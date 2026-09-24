import { CustomNotification } from '../types';

export interface BrowserInfo {
  isAndroid: boolean;
  isOpera: boolean;
  isChrome: boolean;
  isSafari: boolean;
  name: 'Opera' | 'Chrome' | 'Safari' | 'Outro';
}

class NotificationService {
  constructor() {
    // Escuta o evento de que a biblioteca do Median está pronta (se estiver empacotado)
    if (typeof window !== 'undefined') {
      window.addEventListener('gonative_library_ready', () => {
        this.requestPermission();
      });
    }
  }

  getBrowserInfo(): BrowserInfo {
    if (typeof window === 'undefined') {
      return { isAndroid: false, isOpera: false, isChrome: false, isSafari: false, name: 'Outro' };
    }
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isOpera = /OPR\/|Opera|OPT\/|OPRGX/i.test(ua);
    const isChrome = !isOpera && /Chrome|CriOS/i.test(ua);
    const isSafari = !isOpera && !isChrome && /Safari/i.test(ua);
    return {
      isAndroid,
      isOpera,
      isChrome,
      isSafari,
      name: isOpera ? 'Opera' : isChrome ? 'Chrome' : isSafari ? 'Safari' : 'Outro'
    };
  }

  private callMedian(url: string) {
    if (typeof document === 'undefined') return;
    const medianUrl = url.replace('gonative://', 'median://');
    const iframe1 = document.createElement('iframe');
    iframe1.setAttribute('src', url);
    iframe1.setAttribute('style', 'display: none;');
    document.documentElement.appendChild(iframe1);

    const iframe2 = document.createElement('iframe');
    iframe2.setAttribute('src', medianUrl);
    iframe2.setAttribute('style', 'display: none;');
    document.documentElement.appendChild(iframe2);

    setTimeout(() => {
      if (iframe1.parentNode) iframe1.parentNode.removeChild(iframe1);
      if (iframe2.parentNode) iframe2.parentNode.removeChild(iframe2);
    }, 500);
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window || 'serviceWorker' in navigator || !!((window as any).gonative || (window as any).median);
  }

  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      return Notification.permission;
    } catch {
      return 'unsupported';
    }
  }

  async requestPermission(): Promise<{ granted: boolean; status: NotificationPermission | 'unsupported'; error?: string }> {
    const isMedian = typeof window !== 'undefined' && !!((window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative'));
    
    if (isMedian) {
      try {
        if ((window as any).gonative?.oneSignal) {
          (window as any).gonative.oneSignal.register();
        }
        this.callMedian('gonative://onesignal/register');
        return { granted: true, status: 'granted' }; 
      } catch (e: any) {
        console.error('Erro OneSignal:', e);
      }
    }

    // Suporte para Notificações padrão de navegador (Opera Android, Chrome Android, Desktop, Safari, Edge)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        let permission: NotificationPermission;
        // Alguns navegadores mais antigos só suportam callback
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission(resolve);
          });
        }

        return {
          granted: permission === 'granted',
          status: permission
        };
      } catch (e: any) {
        console.error('Erro pedindo permissão de notificação nativa:', e);
        return {
          granted: false,
          status: this.getPermissionStatus(),
          error: e?.message || 'Falha ao solicitar permissão'
        };
      }
    }

    return {
      granted: false,
      status: 'unsupported',
      error: 'Seu navegador não tem suporte à API de Notificações'
    };
  }

  async sendNotification(title: string, options?: NotificationOptions): Promise<{ success: boolean; error?: string }> {
    const isMedian = typeof window !== 'undefined' && !!((window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative'));
    
    if (isMedian) {
      const titleEnc = encodeURIComponent(title);
      const bodyEnc = encodeURIComponent(options?.body || '');
      this.callMedian(`gonative://notifications/create?title=${titleEnc}&body=${bodyEnc}`);
      return { success: true };
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, error: 'Notificações não suportadas neste navegador.' };
    }

    const currentPerm = this.getPermissionStatus();
    if (currentPerm !== 'granted') {
      return { 
        success: false, 
        error: currentPerm === 'denied' 
          ? 'Notificações estão bloqueadas no navegador. Altere nas configurações do site.' 
          : 'Permissão de notificação ainda não foi concedida.' 
      };
    }

    // Usa sempre ícones locais na mesma origem para não ser bloqueado pelo bloqueador de anúncios do Opera
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const iconUrl = `${origin}/icon-192.png`;

    const notifOptions: NotificationOptions = {
      body: options?.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: 'rotafinanceira-notif',
      ...options
    };

    // No Android (Opera e Chrome), chamar `new Notification(...)` gera "TypeError: Illegal constructor".
    // É OBRIGATÓRIO disparar via ServiceWorkerRegistration.showNotification().
    if ('serviceWorker' in navigator) {
      try {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js');
        }

        // Tenta obter o worker com timeout para evitar travamento em navegadores móveis
        const swReadyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<ServiceWorkerRegistration | null>((resolve) => 
          setTimeout(() => resolve(reg || null), 1500)
        );

        const targetReg = (await Promise.race([swReadyPromise, timeoutPromise])) || reg;

        if (targetReg && 'showNotification' in targetReg) {
          await targetReg.showNotification(title, notifOptions);
          return { success: true };
        }
      } catch (swErr) {
        console.warn('Erro ao disparar via Service Worker, tentando fallback:', swErr);
      }
    }

    // Fallback para navegadores que suportam o construtor direto
    try {
      new Notification(title, notifOptions);
      return { success: true };
    } catch (e: any) {
      console.error('Falha ao instanciar notificação:', e);
      return { success: false, error: e?.message || 'Falha ao exibir notificação no navegador.' };
    }
  }

  // Mantido para compatibilidade com tipos existentes
  checkAndTriggerCustomNotifications(_customNotifications: CustomNotification[]) {
    // Agendador opcional
  }

  getDebugInfo() {
    return {
      browser: this.getBrowserInfo(),
      isSupported: this.isSupported(),
      permission: this.getPermissionStatus()
    };
  }
}

export const notificationService = new NotificationService();
