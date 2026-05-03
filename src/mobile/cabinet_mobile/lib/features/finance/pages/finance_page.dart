import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/service/api_service.dart';

class FinancePage extends StatefulWidget {
  const FinancePage({super.key});

  @override
  State<FinancePage> createState() => _FinancePageState();
}

class _FinancePageState extends State<FinancePage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _summary;
  List<dynamic> _receivables = [];
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
      final sumRes = await ApiService.getFinanceSummary();
      final recRes = await ApiService.getReceivables({'pageSize': 50});
      setState(() {
        _summary = sumRes.data['data'] ?? sumRes.data;
        _receivables = recRes.data['data']?['list'] ?? recRes.data['list'] ?? [];
        _loading = false;
      });
    } on DioException {
      setState(() { _error = '加载失败'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('财务管理'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: '应收款'), Tab(text: '资金流水')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : TabBarView(
                  controller: _tabController,
                  children: [_buildReceivables(), _buildFundFlow()],
                ),
    );
  }

  Widget _buildReceivables() {
    final df = DateFormat('yyyy-MM-dd');
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          _buildSummaryCards(),
          const SizedBox(height: 16),
          if (_receivables.isEmpty)
            Center(child: Text('暂无应收款', style: TextStyle(color: Colors.grey[500])))
          else
            ..._receivables.map((r) {
              final amount = (r['amount'] ?? r['total_amount'] ?? 0).toDouble();
              final paid = (r['paid_amount'] ?? r['paidAmount'] ?? 0).toDouble();
              final unpaid = amount - paid;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: unpaid > 0 ? Colors.orange[50] : Colors.green[50],
                    child: Icon(unpaid > 0 ? Icons.warning : Icons.check_circle,
                      color: unpaid > 0 ? Colors.orange : Colors.green),
                  ),
                  title: Text(r['customer_name'] ?? r['customerName'] ?? r['order_no'] ?? ''),
                  subtitle: Text('逾期：${df.format(DateTime.tryParse(r['due_date'] ?? '') ?? DateTime.now())}'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('¥${amount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('未收¥${unpaid.toStringAsFixed(0)}', style: TextStyle(color: unpaid > 0 ? Colors.orange : Colors.green, fontSize: 12)),
                    ],
                  ),
                ),
              );
            }),
        ],
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
      childAspectRatio: 1.8,
      children: [
        _summaryCard('应收账款', '¥${(data['receivable'] ?? data['receivable_amount'] ?? 0).toStringAsFixed(0)}', Colors.blue),
        _summaryCard('应付账款', '¥${(data['payable'] ?? 0).toStringAsFixed(0)}', Colors.orange),
        _summaryCard('本月收款', '¥${(data['collected'] ?? data['this_month_collected'] ?? 0).toStringAsFixed(0)}', Colors.green),
        _summaryCard('本月付款', '¥${(data['paid'] ?? data['this_month_paid'] ?? 0).toStringAsFixed(0)}', Colors.red),
      ],
    );
  }

  Widget _summaryCard(String title, String value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildFundFlow() {
    return Center(child: Text('点击上方刷新按钮加载资金流水', style: TextStyle(color: Colors.grey[500])));
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}
