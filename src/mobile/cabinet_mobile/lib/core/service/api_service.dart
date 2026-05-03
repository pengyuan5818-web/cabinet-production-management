import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class ApiService {
  static late Dio _dio;
  static String? _token;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          _token = null;
        }
        return handler.next(error);
      },
    ));
  }

  static Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static bool get isLoggedIn => _token != null;

  // 认证
  static Future<Response> login(String username, String password) =>
      _dio.post('/auth/login', data: {'username': username, 'password': password});

  static Future<Response> getMe() => _dio.get('/auth/me');

  // 仪表盘
  static Future<Response> getDashboardSummary() => _dio.get('/dashboard/summary');

  // 订单
  static Future<Response> getOrders(Map<String, dynamic> params) =>
      _dio.get('/orders', queryParameters: params);

  static Future<Response> getOrderDetail(String id) =>
      _dio.get('/orders/$id');

  static Future<Response> getOrderTracking(String id) =>
      _dio.get('/orders/$id/tracking');

  // 生产
  static Future<Response> getProductionStages() => _dio.get('/production/stages');

  static Future<Response> getProductionTrack(String orderId) =>
      _dio.get('/production/track/$orderId');

  static Future<Response> getProductionPending(Map<String, dynamic> params) =>
      _dio.get('/production/pending', queryParameters: params);

  static Future<Response> scanBarcode(String barcode) =>
      _dio.get('/production/board/$barcode');

  // 仓库
  static Future<Response> getWarehouseList(Map<String, dynamic> params) =>
      _dio.get('/warehouse/materials', queryParameters: params);

  static Future<Response> getWarehouseSummary() => _dio.get('/warehouse/summary');

  static Future<Response> getWarehouseAlerts() => _dio.get('/warehouse/alerts');

  static Future<Response> scanWarehouse(String barcode) =>
      _dio.get('/warehouse/scan/$barcode');

  static Future<Response> stockIn(Map<String, dynamic> data) =>
      _dio.post('/warehouse/stock-in', data: data);

  static Future<Response> stockOut(Map<String, dynamic> data) =>
      _dio.post('/warehouse/stock-out', data: data);

  // 财务
  static Future<Response> getReceivables(Map<String, dynamic> params) =>
      _dio.get('/finance/receivables', queryParameters: params);

  static Future<Response> getFinanceSummary() => _dio.get('/finance/summary');

  static Future<Response> getFundFlow(Map<String, dynamic> params) =>
      _dio.get('/finance/fund-flow', queryParameters: params);

  // 员工
  static Future<Response> getEmployees(Map<String, dynamic> params) =>
      _dio.get('/employees', queryParameters: params);

  static Future<Response> checkIn(Map<String, dynamic> data) =>
      _dio.post('/employees/attendance/check-in', data: data);

  static Future<Response> checkOut(Map<String, dynamic> data) =>
      _dio.post('/employees/attendance/check-out', data: data);
}
