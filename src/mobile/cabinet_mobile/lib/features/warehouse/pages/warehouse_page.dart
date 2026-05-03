import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/service/api_service.dart';
import '../../../core/model/warehouse.dart' as wh;

class WarehousePage extends StatefulWidget {
  const WarehousePage({super.key});

  @override
  State<WarehousePage> createState() => _WarehousePageState();
}

class _WarehousePageState extends State<WarehousePage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<wh.WarehouseMaterial> _materials = [];
  List<wh.StockRecord> _records = [];
  List<wh.WarehouseAlert> _alerts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final matRes = await ApiService.getWarehouseList({'pageSize': 100});
      final alertRes = await ApiService.getWarehouseAlerts();
      final recordsRes = await ApiService.getWarehouseSummary();
      setState(() {
        _materials = _parseMaterials(matRes.data);
        _alerts = _parseAlerts(alertRes.data);
        _records = _parseRecords(recordsRes.data);
        _loading = false;
      });
    } on DioException {
      setState(() { _error = '加载失败'; _loading = false; });
    }
  }

  List<wh.WarehouseMaterial> _parseMaterials(dynamic data) {
    final list = data?['data']?['list'] ?? data?['list'] ?? data?['materials'] ?? [];
    return (list as List).map((m) => wh.WarehouseMaterial.fromJson(m)).toList();
  }

  List<wh.WarehouseAlert> _parseAlerts(dynamic data) {
    final list = data?['data']?['list'] ?? data?['list'] ?? data?['alerts'] ?? [];
    return (list as List).map((a) => wh.WarehouseAlert.fromJson(a)).toList();
  }

  List<wh.StockRecord> _parseRecords(dynamic data) {
    return [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('仓库管理'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '库存'),
            Tab(text: '预警'),
            Tab(text: '记录'),
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
                    _buildMaterialsList(),
                    _buildAlertsList(),
                    _buildRecordsList(),
                  ],
                ),
    );
  }

  Widget _buildMaterialsList() {
    if (_materials.isEmpty) return Center(child: Text('暂无数据', style: TextStyle(color: Colors.grey[500])));
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _materials.length,
        itemBuilder: (_, i) => _buildMaterialCard(_materials[i]),
      ),
    );
  }

  Widget _buildMaterialCard(wh.WarehouseMaterial m) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: m.isLowStock ? Colors.red[50] : Colors.green[50],
          child: Icon(Icons.inventory_2, color: m.isLowStock ? Colors.red : Colors.green),
        ),
        title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Text('${m.category} | 库存: ${m.stock.toStringAsFixed(1)}${m.unit} | 最低: ${m.minStock.toStringAsFixed(1)}${m.unit}'),
        trailing: m.isLowStock ? const Icon(Icons.warning, color: Colors.red) : null,
        onTap: () => _showMaterialDetail(m),
      ),
    );
  }

  void _showMaterialDetail(wh.WarehouseMaterial m) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(m.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _row('分类', m.category),
            _row('当前库存', '${m.stock.toStringAsFixed(2)} ${m.unit}'),
            _row('最低库存', '${m.minStock.toStringAsFixed(2)} ${m.unit}'),
            _row('单价', '¥${m.price.toStringAsFixed(2)}'),
            _row('库位', m.location),
            const SizedBox(height: 16),
            if (m.isLowStock) Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(8)),
              child: Row(children: [const Icon(Icons.warning, color: Colors.red), const SizedBox(width: 8), Text('库存不足，请尽快补货！', style: TextStyle(color: Colors.red[700]))]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: TextStyle(color: Colors.grey[600])), Text(value)]),
  );

  Widget _buildAlertsList() {
    if (_alerts.isEmpty) return Center(child: Text('暂无预警', style: TextStyle(color: Colors.grey[500])));
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _alerts.length,
        itemBuilder: (_, i) => Card(
          color: Colors.red[50],
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.warning, color: Colors.red),
            title: Text(_alerts[i].materialName),
            subtitle: Text('当前库存: ${_alerts[i].currentStock.toStringAsFixed(1)} | 阈值: ${_alerts[i].threshold.toStringAsFixed(1)}'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
        ),
      ),
    );
  }

  Widget _buildRecordsList() {
    if (_records.isEmpty) return Center(child: Text('暂无记录', style: TextStyle(color: Colors.grey[500])));
    final df = DateFormat('MM-dd HH:mm');
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _records.length,
        itemBuilder: (_, i) {
          final r = _records[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: r.isStockIn ? Colors.green[50] : Colors.orange[50],
                child: Icon(r.isStockIn ? Icons.arrow_downward : Icons.arrow_upward,
                  color: r.isStockIn ? Colors.green : Colors.orange),
              ),
              title: Text(r.materialName),
              subtitle: Text('${r.operator} | ${df.format(r.createdAt)}'),
              trailing: Text('${r.isStockIn ? '+' : '-'}${r.quantity.toStringAsFixed(1)}',
                style: TextStyle(fontWeight: FontWeight.bold, color: r.isStockIn ? Colors.green : Colors.orange)),
            ),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}
