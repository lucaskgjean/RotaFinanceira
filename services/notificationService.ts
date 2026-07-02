
import { CustomNotification } from '../types';

class NotificationService {
  constructor() {
    // Escuta o evento de que a biblioteca do Median está pronta
    window.addEventListener('gonative_library_ready', () => {
      this.requestPermission();
    });
  }

  private callMedian(url: string) {
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

  async requestPermission(): Promise<boolean> {
    const isMedian = !!((window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative'));
    
    if (isMedian) {
      try {
        if ((window as any).gonative?.oneSignal) {
          (window as any).gonative.oneSignal.register();
        }
        this.callMedian('gonative://onesignal/register');
        return true; 
      } catch (e) {
        console.error('Erro OneSignal:', e);
      }
    }

    // Suporte para Notificações padrão de navegador / WebView
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.error('Erro pedindo permissão de notificação nativa:', e);
      }
    }
    return false;
  }

  sendNotification(title: string, options?: NotificationOptions) {
    const isMedian = !!((window as any).gonative || (window as any).median || navigator.userAgent.includes('gonative'));
    if (isMedian) {
      const titleEnc = encodeURIComponent(title);
      const bodyEnc = encodeURIComponent(options?.body || '');
      this.callMedian(`gonative://notifications/create?title=${titleEnc}&body=${bodyEnc}`);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: options?.body,
          icon: '/favicon.ico',
          ...options
        });
      } catch (e) {
        console.warn('Notification constructor failed, trying service worker registration notification:', e);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          }).catch(err => console.error('SW notification error:', err));
        }
      }
    }
  }

  // Mantido apenas para compatibilidade de tipos, mas sem lógica de disparo agendado
  checkAndTriggerCustomNotifications(_customNotifications: CustomNotification[]) {
    // Lógica removida a pedido do usuário
  }

  getDebugInfo() {
    return {};
  }
}

export const notificationService = new NotificationService();
