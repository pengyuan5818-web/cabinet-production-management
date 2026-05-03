import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/service/api_service.dart';
import '../../orders/pages/orders_page.dart';
import '../../production/pages/production_page.dart';
import '../../warehouse/pages/warehouse_page.dart';
import '../../finance/pages/finance_page.dart';
import '../widgets/dashboard_card.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  Map<String, dynamic>? _summary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    try {
      final res = await ApiService.getDashboardSummary();
      setState(() {
        _summary = res.data['data'] ?? res.data;
        _loading = false;
      });
    } on DioException {
      setState(() {
        _error = '无法连接服务器，请检查网络';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('橱柜工厂'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSummary,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _loadSummary,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSummaryCards(),
                      const SizedBox(height: 24),
                      _buildQuickActions(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSummaryCards() {
    final data = _summary ?? {};
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        DashboardCard(
          title: '今日订单',
          value: '${data['todayOrders'] ?? data['today_orders'] ?? 0}',
          icon: Icons.shopping_cart,
          color: Colors.blue,
        ),
        DashboardCard(
          title: '生产中',
          value: '${data['producingOrders'] ?? data['producing_orders'] ?? 0}',
          icon: Icons.construction,
          color: Colors.orange,
        ),
        DashboardCard(
          title: '待发货',
          value: '${data['pendingShipment'] ?? data['pending_shipment'] ?? 0}',
          icon: Icons.local_shipping,
          color: Colors.green,
        ),
        DashboardCard(
          title: '库存预警',
          value: '${data['lowStockAlerts'] ?? data['low_stock_alerts'] ?? 0}',
          icon: Icons.warning,
          color: Colors.red,
        ),
      ],
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '快捷功能',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 4,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: [
            _actionItem(Icons.receipt_long, '订单', () => _navigate(const OrdersPage())),
            _actionItem(Icons.build, '生产', () => _navigate(const ProductionPage())),
            _actionItem(Icons.warehouse, '仓库', () => _navigate(const WarehousePage())),
            _actionItem(Icons.account_balance_wallet, '财务', () => _navigate(const FinancePage())),
          ],
        ),
      ],
    );
  }

  Widget _actionItem(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 28),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }

  void _navigate(Widget page) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  }
}
