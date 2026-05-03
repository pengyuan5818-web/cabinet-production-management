import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/service/api_service.dart';
import '../../../core/model/order.dart';

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  List<Order> _orders = [];
  bool _loading = true;
  String? _error;
  String _status = 'all';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    try {
      final params = <String, dynamic>{'page': 1, 'pageSize': 20};
      if (_status != 'all') params['status'] = _status;
      if (_searchController.text.isNotEmpty) params['keyword'] = _searchController.text;
      final res = await ApiService.getOrders(params);
      final list = res.data['data']?['list'] ?? res.data['list'] ?? res.data['orders'] ?? [];
      setState(() {
        _orders = (list as List).map((o) => Order.fromJson(o)).toList();
        _loading = false;
      });
    } on DioException {
      setState(() { _error = '加载失败'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('订单管理')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '搜索订单号/客户名...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(icon: const Icon(Icons.clear), onPressed: () { _searchController.clear(); _loadOrders(); }),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onSubmitted: (_) => _loadOrders(),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: ['all', 'pending', 'producing', 'completed'].map((s) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(_statusLabel(s)),
                  selected: _status == s,
                  onSelected: (_) => setState(() { _status = s; _loadOrders(); }),
                ),
              )).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
                    : RefreshIndicator(
                        onRefresh: _loadOrders,
                        child: _orders.isEmpty
                            ? const Center(child: Text('暂无订单'))
                            : ListView.builder(
                                itemCount: _orders.length,
                                itemBuilder: (_, i) => _buildOrderCard(_orders[i]),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  String _statusLabel(String s) {
    return {'all': '全部', 'pending': '待生产', 'producing': '生产中', 'completed': '已完成'}[s] ?? s;
  }

  Color _statusColor(String status) {
    return {
      'pending': Colors.orange,
      'producing': Colors.blue,
      'completed': Colors.green,
      'cancelled': Colors.grey,
    }[status] ?? Colors.grey;
  }

  Widget _buildOrderCard(Order order) {
    final df = DateFormat('yyyy-MM-dd');
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: InkWell(
        onTap: () => _showOrderDetail(order),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(order.orderNo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _statusColor(order.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(_statusLabel(order.status), style: TextStyle(color: _statusColor(order.status), fontSize: 12)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text('客户：${order.customerName}', style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 4),
              Text('经销商：${order.dealerName}', style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('¥${order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.deepOrange)),
                  if (order.deliveryDate != null) Text('交付：${df.format(order.deliveryDate!)}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                ],
              ),
              if (order.stages.isNotEmpty) ...[
                const Divider(height: 16),
                _buildStageProgress(order),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStageProgress(Order order) {
    return Row(
      children: order.stages.take(5).map((s) {
        return Expanded(
          child: Column(
            children: [
              Container(
                height: 4,
                decoration: BoxDecoration(
                  color: s.isCompleted ? Colors.green : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 4),
              Text(s.name, style: const TextStyle(fontSize: 9), overflow: TextOverflow.ellipsis),
            ],
          ),
        );
      }).toList(),
    );
  }

  void _showOrderDetail(Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          children: [
            Text(order.orderNo, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _detailRow('客户', order.customerName),
            _detailRow('经销商', order.dealerName),
            _detailRow('订单金额', '¥${order.totalAmount.toStringAsFixed(2)}'),
            _detailRow('已付款', '¥${order.paidAmount.toStringAsFixed(2)}'),
            _detailRow('未付款', '¥${order.unpaidAmount.toStringAsFixed(2)}'),
            _detailRow('当前阶段', order.currentStage),
            _detailRow('创建时间', DateFormat('yyyy-MM-dd HH:mm').format(order.createdAt)),
            if (order.deliveryDate != null) _detailRow('交付日期', DateFormat('yyyy-MM-dd').format(order.deliveryDate!)),
            if (order.stages.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('生产阶段', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...order.stages.map((s) => ListTile(
                dense: true,
                leading: Icon(s.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: s.isCompleted ? Colors.green : Colors.grey),
                title: Text(s.name),
                subtitle: s.startTime != null ? Text('${DateFormat('MM-dd HH:mm').format(s.startTime!)}${s.endTime != null ? ' → ${DateFormat('MM-dd HH:mm').format(s.endTime!)}' : ''}') : null,
              )),
            ],
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [Text(label, style: TextStyle(color: Colors.grey[600])), Text(value)],
    ),
  );

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}
