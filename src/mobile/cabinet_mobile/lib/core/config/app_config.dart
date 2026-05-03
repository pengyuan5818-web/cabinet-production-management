class AppConfig {
  // 生产环境API地址（发布时改为实际服务器地址）
  static const String apiBase = 'https://feniercabinets-api.cpolar.cn/api';
  
  // 开发环境API地址（可通过调试模式覆盖）
  static const String apiBaseDev = 'http://localhost:3001/api';
  
  static String get baseUrl => apiBase;
}
