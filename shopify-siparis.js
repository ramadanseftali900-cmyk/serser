// Vercel Serverless Function - Shopify Sipariş API
// Endpoint: /api/shopify-siparis (her site kendi domaininde çalışır)

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Sadece POST kabul et
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Sadece POST' });
    }
    
    try {
        const { siparis, shopifyConfig } = req.body;
        
        if (!siparis || !shopifyConfig) {
            return res.status(400).json({ error: 'Sipariş ve Shopify bilgileri gerekli' });
        }
        
        const { store, token } = shopifyConfig;
        
        if (!store || !token) {
            return res.status(400).json({ error: 'Store ve Token gerekli' });
        }
        
        // Mağaza adını al (luma-10053 gibi)
        const storeName = store.replace('.myshopify.com', '');
        
        // Shopify Draft Order oluştur (GraphQL)
        const graphqlUrl = `https://${storeName}.myshopify.com/admin/api/2024-01/graphql.json`;
        
        // Fiyatı sayıya çevir
        const fiyatStr = siparis.tutar || '0';
        const fiyat = parseFloat(fiyatStr.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        const adetSayi = siparis.adet === '2 Adet' ? 2 : 1;
        const birimFiyat = fiyat / adetSayi;
        
        // GraphQL mutation - Draft Order oluştur
        const mutation = `
            mutation draftOrderCreate($input: DraftOrderInput!) {
                draftOrderCreate(input: $input) {
                    draftOrder {
                        id
                        name
                        totalPrice
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        
        const variables = {
            input: {
                lineItems: [{
                    title: siparis.urunAdi || 'Ürün',
                    quantity: adetSayi,
                    originalUnitPrice: birimFiyat.toFixed(2)
                }],
                shippingAddress: {
                    firstName: siparis.musteri?.split(' ')[0] || '',
                    lastName: siparis.musteri?.split(' ').slice(1).join(' ') || '',
                    address1: siparis.adres || '',
                    city: siparis.ilce || '',
                    province: siparis.il || '',
                    country: 'TR',
                    phone: siparis.telefon || ''
                },
                billingAddress: {
                    firstName: siparis.musteri?.split(' ')[0] || '',
                    lastName: siparis.musteri?.split(' ').slice(1).join(' ') || '',
                    address1: siparis.adres || '',
                    city: siparis.ilce || '',
                    province: siparis.il || '',
                    country: 'TR',
                    phone: siparis.telefon || ''
                },
                note: `Sipariş No: ${siparis.siparisNo} | Ödeme: ${siparis.odemeYontemi} | Tarih: ${siparis.tarih}`,
                tags: ['kargonburada', 'kapida-odeme']
            }
        };
        
        const shopifyResponse = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': token
            },
            body: JSON.stringify({ query: mutation, variables })
        });
        
        const result = await shopifyResponse.json();
        
        if (result.errors) {
            return res.status(400).json({ 
                error: 'Shopify API hatası', 
                details: result.errors 
            });
        }
        
        if (result.data?.draftOrderCreate?.userErrors?.length > 0) {
            return res.status(400).json({ 
                error: 'Shopify sipariş hatası', 
                details: result.data.draftOrderCreate.userErrors 
            });
        }
        
        const draftOrder = result.data?.draftOrderCreate?.draftOrder;
        
        return res.status(200).json({ 
            success: true, 
            message: 'Shopify siparişi oluşturuldu',
            shopifyOrderId: draftOrder?.id,
            shopifyOrderName: draftOrder?.name
        });
        
    } catch (error) {
        console.error('Shopify API Error:', error);
        return res.status(500).json({ 
            error: 'Sunucu hatası', 
            message: error.message 
        });
    }
}
