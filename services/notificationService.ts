
import { CustomNotification } from '../types';

class NotificationService {
  // Método para verificar o status técnico (ajuda no diagnóstico)
  getDebugInfo() {
    const isMedian = (window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative');
    const hasOneSignal = !!(window as any).gonative?.oneSignal;
    const hasNotifications = !!(window as any).gonative?.notifications;
    const permission = (window as any).Notification?.permission || 'unknown';
    
    return {
      isMedian,
      hasOneSignal,
      hasNotifications,
      permission,
      userAgent: navigator.userAgent
    };
  }

  private callMedian(url: string) {
    console.log('Comando Android:', url);
    
    // 1. Tenta via JavaScript nativo se disponível
    const isMedian = (window as any).gonative || (window as any).median;
    if (isMedian) {
      const title = url.includes('title=') ? decodeURIComponent(url.split('title=')[1].split('&')[0]) : '';
      const body = url.includes('body=') ? decodeURIComponent(url.split('body=')[1].split('&')[0]) : '';

      // Tenta o objeto de notificações locais (mais estável)
      if ((window as any).gonative?.notifications?.create) {
        try {
          (window as any).gonative.notifications.create({ title, body });
          return;
        } catch (e) { console.error(e); }
      }
    }

    // 2. Fallback para URL Scheme (O método mais compatível)
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', url);
    iframe.setAttribute('style', 'display: none;');
    document.documentElement.appendChild(iframe);
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  }

  async requestPermission(): Promise<boolean> {
    const isMedian = (window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative');
    
    if (isMedian) {
      try {
        // 1. Tenta registrar no OneSignal nativo e envia uma tag de teste
        if ((window as any).gonative?.oneSignal) {
          (window as any).gonative.oneSignal.register();
          // Envia uma tag para o OneSignal saber que o usuário está ativo no app
          (window as any).gonative.oneSignal.sendTag({ key: 'app_active', value: 'true' });
        }
        
        // 2. Tenta abrir o diálogo de permissão do Android
        this.callMedian('gonative://notifications/register');
        return true; 
      } catch (e) {
        console.error('Erro Median Permission:', e);
      }
    }

    // 2. Tenta o método padrão da Web
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações desktop');
      // Se for mobile mas não suportar a API Notification, permitimos ativar a lógica interna
      return isMedian; 
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      // Alguns navegadores mobile antigos lançam erro no requestPermission
      return isMedian;
    }
  }

  sendNotification(title: string, options?: NotificationOptions) {
    const isMedian = (window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative');
    const icon = 'https://cdn-icons-png.flaticon.com/512/1165/1165961.png';

    // 1. Se estiver no Median, tenta a ponte nativa para garantir que chegue no Android
    if (isMedian) {
      try {
        const titleEnc = encodeURIComponent(title);
        const bodyEnc = encodeURIComponent(options?.body || '');
        
        // Tenta o método de notificação local (mais garantido para lembretes)
        this.callMedian(`gonative://notifications/local/create?title=${titleEnc}&body=${bodyEnc}`);
        
        // Tenta também o método de notificação imediata como fallback
        this.callMedian(`gonative://notifications/create?title=${titleEnc}&body=${bodyEnc}`);
      } catch (e) {
        console.error('Erro ao chamar ponte de notificação Median:', e);
      }
    }

    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      // Tenta usar o ServiceWorker se disponível (melhor para Android/Median)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: icon,
            badge: icon,
            vibrate: [100, 50, 100],
            ...options,
          } as any);
        }).catch(() => {
          // Fallback se o SW falhar
          new Notification(title, { icon, ...options });
        });
      } else {
        try {
          new Notification(title, { icon, ...options });
        } catch (e) {
          console.error('Erro ao enviar notificação:', e);
        }
      }
    }
  }

  checkAndTriggerCustomNotifications(customNotifications: CustomNotification[]) {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    customNotifications.forEach(notif => {
      if (notif.enabled && notif.time === currentTime && notif.days.includes(currentDay)) {
        // Evita disparar múltiplas vezes no mesmo minuto
        const lastTriggered = localStorage.getItem(`notif_last_${notif.id}`);
        const todayStr = now.toISOString().split('T')[0];
        const triggerKey = `${todayStr}_${currentTime}`;

        if (lastTriggered !== triggerKey) {
          this.sendNotification(notif.title, { body: notif.message });
          localStorage.setItem(`notif_last_${notif.id}`, triggerKey);
        }
      }
    });
  }
}

export const notificationService = new NotificationService();
