// ============================================
// FIREBASE YAPILANDIRMA DOSYASI
// ============================================

// Site ID kontrolü
if (typeof SITE_ID === 'undefined') {
    console.warn('⚠️ SITE_ID tanımlı değil! site-config.js dosyasını ekleyin.');
    var SITE_ID = 'default';
}

// Site ID'li localStorage key oluştur
if (typeof getSiteKey === 'undefined') {
    function getSiteKey(key) {
        return SITE_ID + '_' + key;
    }
}

// SENİN FIREBASE AYARLARIN
var firebaseConfig = {
    apiKey: "BURAYA-API-KEY-YAZ",
    authDomain: "hizlikargo-93a30.firebaseapp.com",
    databaseURL: "https://hizlikargo-93a30-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hizlikargo-93a30",
    storageBucket: "hizlikargo-93a30.firebasestorage.app",
    messagingSenderId: "604815462602",
    appId: "1:604815462602:web:a94cfeb7135a1fcf136433",
    measurementId: "G-6D2MVMYFKZ"
};

// Firebase değişkenleri
var database = null;
var storage = null;
var firebaseHazir = false;
var firebaseHazirCallbacks = [];

// Firebase hazır olduğunda çağrılacak fonksiyonları kaydet
function onFirebaseReady(callback) {
    if (firebaseHazir && database) {
        try { callback(database); } catch(e) { console.error('onFirebaseReady callback hatası:', e); }
    } else {
        firebaseHazirCallbacks.push(callback);
    }
}

// Firebase'i başlat
function initFirebase() {
    console.log('🔄 Firebase başlatılıyor...');
    
    if (typeof firebase !== 'undefined') {
        try {
            // Zaten başlatılmış mı kontrol et
            if (firebase.apps && firebase.apps.length > 0) {
                console.log('✅ Firebase zaten başlatılmış');
            } else {
                firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase başlatıldı!');
            }
            
            database = firebase.database();
            console.log('✅ Database bağlantısı kuruldu');
            
            // Storage varsa başlat
            if (firebase.storage) {
                storage = firebase.storage();
                console.log('✅ Storage bağlantısı kuruldu');
            }
            
            firebaseHazır = true;
            
            // Bekleyen callback'leri çağır
            console.log('📢 ' + firebaseHazirCallbacks.length + ' callback çağrılıyor...');
            firebaseHazirCallbacks.forEach(function(cb) {
                try { cb(database); } catch(e) { console.error('Callback hatası:', e); }
            });
            firebaseHazirCallbacks = [];
            
            // Global event tetikle
            window.dispatchEvent(new CustomEvent('firebaseReady', { detail: { database: database } }));
            
        } catch(e) {
            console.error('⚠️ Firebase başlatma hatası:', e.message);
        }
    } else {
        console.log('⏳ Firebase SDK bekleniyor...');
        setTimeout(initFirebase, 100);
    }
}

// Sayfa yüklendiğinde Firebase'i başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
} else {
    initFirebase();
}

// WhatsApp numarasını al
function getWhatsAppNumber() {
    var wpNumara = localStorage.getItem(getSiteKey('whatsapp_numara'));
    if (wpNumara) return wpNumara;
    
    var saved = localStorage.getItem(getSiteKey('account_settings'));
    if (saved) {
        try {
            var s = JSON.parse(saved);
            if (s.whatsappNumber) return s.whatsappNumber;
        } catch(e) {}
    }
    return "";
}

console.log('📦 Firebase Config yüklendi - Project:', firebaseConfig.projectId);

