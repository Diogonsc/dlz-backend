import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';

@Injectable()
export class PwaService {
  constructor(private readonly prisma: PrismaService) {}

  async generateManifest(tenantId?: string, startPath = '/', origin?: string) {
    let storeName = 'Delivery';
    let storeIcon = '';
    let themeColor = '#1a1a2e';
    let accentColor = '#e8a838';

    if (tenantId) {
      const store = await this.prisma.storeConfig.findFirst({
        where: tenantId.length > 10 ? { tenantId } : { slug: tenantId },
        include: { tenant: { select: { themePrimary: true, themeAccent: true } } },
      });

      if (store) {
        storeName = store.storeName || 'Delivery';
        storeIcon = store.avatar || '';
        themeColor = store.primaryColor || store.tenant?.themePrimary || '#1a1a2e';
        accentColor = store.accentColor || store.tenant?.themeAccent || '#e8a838';
      }
    }

    if (storeIcon && !storeIcon.startsWith('http') && origin) {
      storeIcon = `${origin}${storeIcon.startsWith('/') ? '' : '/'}${storeIcon}`;
    }

    const safeStart = (startPath || '/').startsWith('/') ? startPath : '/';

    const manifest: Record<string, any> = {
      name: storeName,
      short_name: storeName.split(' ')[0],
      description: `Faça seu pedido em ${storeName}`,
      start_url: safeStart,
      display: 'standalone',
      orientation: 'portrait',
      theme_color: themeColor,
      background_color: '#ffffff',
      lang: 'pt-BR',
      icons: [],
    };

    if (storeIcon) {
      manifest.icons = [
        { src: storeIcon, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: storeIcon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ];
    } else {
      manifest.icons = [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ];
    }

    return manifest;
  }
}
