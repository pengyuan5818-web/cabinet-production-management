import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/service/api_service.dart';
import '../../../core/model/order.dart';

class ProductionPage extends StatefulWidget {
  const ProductionPage({super.key});

  @override
  State<ProductionPage> createState() => _ProductionPageState();
}

class _ProductionPageState extends State<ProductionPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Order> _pending = [];
  List<Order> _inProgress = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final pendingRes = await ApiService.getProductionPending({'status': 'pending', 'pageSize': 50});
      final progressRes = await ApiService.getProductionPending({'status': 'in_progress', 'pageSize': 50});
      setState(() {
        _pending = _parseOrders(pendingRes.data);
        _inProgress = _parseOrders(progressRes.data);
        _loading = false;
      });
    } on DioException {
      setState(() { _error = '加载失败'; _loading = false; });
    }
  }

  List<Order> _parseOrders(dynamic data) {
    final list = data?['data']?['list'] ?? data?['list'] ?? data?['orders'] ?? [];
    return (list as List).map((o) => Order.fromJson(o)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('生产跟踪'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: '待生产 (${_pending.length})'),
            Tab(text: '生产中 (${_inProgress.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildList(_pending, '暂无待生产订单'),
                    _buildList(_inProgress, '暂无生产中订单'),
                  ],
                ),
    );
  }

  Widget _buildList(List<Order> orders, String emptyMsg) {
    if (orders.isEmpty) return Center(child: Text(emptyMsg, style: TextStyle(color: Colors.grey[500])));
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: orders.length,
        itemBuilder: (_, i) => _buildCard(orders[i]),
      ),
    );
  }

  Widget _buildCard(Order order) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(order.orderNo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(order.currentStage, style: const TextStyle(color: Colors.blue, fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('客户：${order.customerName}', style: TextStyle(color: Colors.grey[600])),
            Text('经销商：${order.dealerName}', style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('¥${order.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange)),
                Text('创建：${DateFormat('MM-dd').format(order.createdAt)}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              ],
            ),
            if (order.stages.isNotEmpty) ...[
              const Divider(height: 16),
              _buildStageRow(order),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStageRow(Order order) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: order.stages.map((s) {
        return Chip(
          avatar: Icon(s.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 16, color: s.isCompleted ? Colors.green : Colors.grey),
          label: Text(s.name, style: const TextStyle(fontSize: 12)),
          padding: EdgeInsets.zero,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        );
      }).toList(),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}
