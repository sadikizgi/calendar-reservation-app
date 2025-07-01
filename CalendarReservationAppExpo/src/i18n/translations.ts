export const translations = {
  tr: {
    // App Name & Branding
    appName: 'Reservas',
    appTagline: 'Rezervasyon Yönetimi',
    categories: {
      house: 'Ev',
      residence: 'Konut',
      room: 'Oda'
    },

    // Auth
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    logout: 'Çıkış',
    businessName: 'İşletme Adı',
    email: 'E-posta',
    password: 'Şifre',
    alreadyHaveAccount: 'Zaten hesabınız var mı? Giriş yapın',
    noAccount: 'Hesabınız yok mu? Kayıt olun',

    // Messages
    error: 'Hata',
    success: 'Başarılı',
    info: 'Bilgi',
    cancel: 'İptal',
    save: 'Kaydet',
    delete: 'Sil',
    edit: 'Düzenle',
    add: 'Ekle',
    approve: 'Onayla',
    reject: 'Reddet',
    search: 'Ara',
    clear: 'Temizle',
    ok: 'Tamam',

    // Auth Messages
    invalidCredentials: 'Geçersiz işletme adı veya şifre. Sadece onaylanmış kullanıcılar giriş yapabilir.',
    userAlreadyExists: 'Bu işletme adı veya e-posta zaten kayıtlı. Lütfen farklı bilgiler deneyin.',
    registrationSuccess: 'Kayıt Başarılı',
    pendingApproval: 'Hesabınız oluşturuldu. Giriş yapabilmeniz için sistem yöneticisinin onayını beklemeniz gerekiyor. Onay aldıktan sonra işletme adı ve şifrenizle giriş yapabilirsiniz.',
    fieldsRequired: 'İşletme adı ve şifre gerekli',
    emailRequired: 'E-posta adresi gerekli',

    // Dashboard
    totalProperties: 'Toplam Ev',
    activeReservations: 'Aktif Rezervasyon',
    findAvailableProperties: 'Boş Gün Bul',
    selectStartDate: 'Başlangıç tarihini seçin:',
    selectEndDate: 'Bitiş tarihini seçin:',
    startDate: 'Başlangıç',
    endDate: 'Bitiş',
    availableProperties: 'Boş Evler:',
    noPropertiesAvailable: 'Seçilen tarihlerde boş ev bulunamadı',
    selectDatesError: 'Lütfen başlangıç ve bitiş tarihlerini seçin',
    invalidDateRange: 'Başlangıç tarihi bitiş tarihinden sonra olamaz',

    // Properties
    propertyName: 'Ev Adı',
    address: 'Adres',
    description: 'Açıklama',
    propertyNameRequired: 'Ev adı gerekli',
    addProperty: 'Ev Ekle',
    editProperty: 'Evi Düzenle',
    deleteProperty: 'Evi Sil',
    propertyManagement: 'Ev Yönetimi',
    noPropertiesYet: 'Henüz ev eklenmemiş',
    addFirstProperty: 'İlk evinizi ekleyerek başlayın',
    propertyAdded: 'Ev eklendi',
    propertyUpdated: 'Ev güncellendi',
    propertyDeleted: 'Ev ve ilgili rezervasyonlar silindi',
    deletePropertyConfirm: 'evini silmek istediğinizden emin misiniz? Bu ev ile ilgili tüm rezervasyonlar da silinecek.',
    addedOn: 'Eklendi:',

    // Reservations
    reservation: 'Rezervasyon',
    addReservation: 'Rezervasyon Ekle',
    manageReservation: 'Rezervasyonu Yönet',
    makeReservation: 'Rezervasyon Yap',
    reservationTitle: 'Rezervasyon Başlığı',
    noReservationToday: 'Bu tarihte rezervasyon yok',
    reservationCount: 'rezervasyon',
    confirmed: 'Onaylandı',
    pending: 'Beklemede',
    cancelled: 'İptal Edildi',
    deleteReservation: 'Rezervasyonu Sil',
    reservationDeleted: 'Rezervasyon silindi',
    deleteReservationConfirm: 'Bu rezervasyonu silmek istediğinizden emin misiniz?',

    // Calendar
    today: 'Bugün',
    monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],

    // Master Dashboard
    systemManagement: 'Reservas Master',
    pendingUsers: 'Onay Bekleyen',
    activeUsers: 'Aktif Kullanıcı',
    pendingApprovals: 'Onay Bekleyen Kullanıcılar',
    approvedUsers: 'Onaylanmış Kullanıcılar',
    registrationDate: 'Kayıt Tarihi:',
    lastLogin: 'Son Giriş:',
    userApproved: 'Kullanıcı onaylandı',
    userRejected: 'Kullanıcı reddedildi ve silindi',
    rejectUser: 'Kullanıcıyı Reddet',
    rejectConfirm: 'Bu kullanıcının kaydını reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    deactivateUser: 'Kullanıcıyı Devre Dışı Bırak',
    deactivateConfirm: 'Bu kullanıcının hesabını devre dışı bırakmak istediğinizden emin misiniz?',
    userDeactivated: 'Kullanıcı devre dışı bırakıldı',
    deactivate: 'Devre Dışı',
    noApprovedUsers: 'Henüz onaylanmış kullanıcı yok',
    loadingUsers: 'Kullanıcılar yükleniyor...',

    // User Management
    users: 'Kullanıcılar',
    subUsers: 'Alt Kullanıcılar',
    showMySubUsers: 'Alt Kullanıcılarımı Göster',
    noSubUsersYet: 'Henüz alt kullanıcı eklenmemiş',

    // Data Screen
    data: 'Veriler',
    viewData: 'Verileri Görüntüle',
    myData: 'Verilerim',
    myProperties: 'Evlerim:',
    myReservations: 'Rezervasyon:',
    mySubUsers: 'Alt Kullanıcı:',

    // Navigation
    properties: 'Evlerim',
    propertyManagementTab: 'Ev Yönetimi',

    // Settings
    settings: 'Ayarlar',
    language: 'Dil',
    turkish: 'Türkçe',
    english: 'English',

    // Errors
    genericError: 'Bir hata oluştu',
    loadError: 'Veri yüklenemedi',
    saveError: 'Veri kaydedilemedi',
    deleteError: 'Veri silinemedi',
    userInfoNotFound: 'Kullanıcı bilgisi bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.',
  },

  en: {
    // App Name & Branding
    appName: 'Reservas',
    appTagline: 'Reservation Management',
    categories: {
      house: 'House',
      residence: 'Residence',
      room: 'Room'
    },

    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    businessName: 'Business Name',
    email: 'Email',
    password: 'Password',
    alreadyHaveAccount: 'Already have an account? Login',
    noAccount: "Don't have an account? Register",

    // Messages
    error: 'Error',
    success: 'Success',
    info: 'Info',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    approve: 'Approve',
    reject: 'Reject',
    search: 'Search',
    clear: 'Clear',
    ok: 'OK',

    // Auth Messages
    invalidCredentials: 'Invalid business name or password. Only approved users can login.',
    userAlreadyExists: 'This business name or email is already registered. Please try different information.',
    registrationSuccess: 'Registration Successful',
    pendingApproval: 'Your account has been created. You need to wait for system administrator approval to login. After approval, you can login with your business name and password.',
    fieldsRequired: 'Business name and password required',
    emailRequired: 'Email address required',

    // Dashboard
    totalProperties: 'Total Properties',
    activeReservations: 'Active Reservations',
    findAvailableProperties: 'Find Available',
    selectStartDate: 'Select start date:',
    selectEndDate: 'Select end date:',
    startDate: 'Start',
    endDate: 'End',
    availableProperties: 'Available Properties:',
    noPropertiesAvailable: 'No properties available for selected dates',
    selectDatesError: 'Please select start and end dates',
    invalidDateRange: 'Start date cannot be after end date',

    // Properties
    propertyName: 'Property Name',
    address: 'Address',
    description: 'Description',
    propertyNameRequired: 'Property name required',
    addProperty: 'Add Property',
    editProperty: 'Edit Property',
    deleteProperty: 'Delete Property',
    propertyManagement: 'Property Management',
    noPropertiesYet: 'No properties added yet',
    addFirstProperty: 'Start by adding your first property',
    propertyAdded: 'Property added',
    propertyUpdated: 'Property updated',
    propertyDeleted: 'Property and related reservations deleted',
    deletePropertyConfirm: ' property? All related reservations will also be deleted.',
    addedOn: 'Added:',

    // Reservations
    reservation: 'Reservation',
    addReservation: 'Add Reservation',
    manageReservation: 'Manage Reservation',
    makeReservation: 'Make Reservation',
    reservationTitle: 'Reservation Title',
    noReservationToday: 'No reservations for this date',
    reservationCount: 'reservations',
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    deleteReservation: 'Delete Reservation',
    reservationDeleted: 'Reservation deleted',
    deleteReservationConfirm: 'Are you sure you want to delete this reservation?',

    // Calendar
    today: 'Today',
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    // Master Dashboard
    systemManagement: 'Reservas Master',
    pendingUsers: 'Pending Users',
    activeUsers: 'Active Users',
    pendingApprovals: 'Pending User Approvals',
    approvedUsers: 'Approved Users',
    registrationDate: 'Registration Date:',
    lastLogin: 'Last Login:',
    userApproved: 'User approved',
    userRejected: 'User rejected and deleted',
    rejectUser: 'Reject User',
    rejectConfirm: 'Are you sure you want to reject this user registration? This action cannot be undone.',
    deactivateUser: 'Deactivate User',
    deactivateConfirm: 'Are you sure you want to deactivate this user account?',
    userDeactivated: 'User deactivated',
    deactivate: 'Deactivate',
    noApprovedUsers: 'No approved users yet',
    loadingUsers: 'Loading users...',

    // User Management
    users: 'Users',
    subUsers: 'Sub Users',
    showMySubUsers: 'Show My Sub Users',
    noSubUsersYet: 'No sub users added yet',

    // Data Screen
    data: 'Data',
    viewData: 'View Data',
    myData: 'My Data',
    myProperties: 'My Properties:',
    myReservations: 'Reservations:',
    mySubUsers: 'Sub Users:',

    // Navigation
    properties: 'Properties',
    propertyManagementTab: 'Property Mgmt',

    // Settings
    settings: 'Settings',
    language: 'Language',
    turkish: 'Türkçe',
    english: 'English',

    // Errors
    genericError: 'An error occurred',
    loadError: 'Could not load data',
    saveError: 'Could not save data',
    deleteError: 'Could not delete data',
    userInfoNotFound: 'User information not found. Please logout and login again.',
  }
};

export type TranslationKey = keyof typeof translations.tr;