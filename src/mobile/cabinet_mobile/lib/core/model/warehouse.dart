class WarehouseMaterial {
  final String id;
  final String name;
  final String category;
  final String unit;
  final double stock;
  final double minStock;
  final double price;
  final String location;

  WarehouseMaterial({
    required this.id,
    required this.name,
    required this.category,
    required this.unit,
    required this.stock,
    required this.minStock,
    required this.price,
    required this.location,
  });

  factory WarehouseMaterial.fromJson(Map<String, dynamic> json) {
    return WarehouseMaterial(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      unit: json['unit'] ?? '',
      stock: (json['stock'] ?? 0).toDouble(),
      minStock: (json['min_stock'] ?? json['minStock'] ?? 0).toDouble(),
      price: (json['price'] ?? 0).toDouble(),
      location: json['location'] ?? '',
    );
  }

  bool get isLowStock => stock <= minStock;
}

class StockRecord {
  final String id;
  final String materialName;
  final String type;
  final double quantity;
  final String operator;
  final DateTime createdAt;
  final String? remark;

  StockRecord({
    required this.id,
    required this.materialName,
    required this.type,
    required this.quantity,
    required this.operator,
    required this.createdAt,
    this.remark,
  });

  factory StockRecord.fromJson(Map<String, dynamic> json) {
    return StockRecord(
      id: json['id'] ?? '',
      materialName: json['material_name'] ?? json['materialName'] ?? '',
      type: json['type'] ?? '',
      quantity: (json['quantity'] ?? 0).toDouble(),
      operator: json['operator'] ?? '',
      createdAt: DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') ?? DateTime.now(),
      remark: json['remark'],
    );
  }

  bool get isStockIn => type == 'stock_in' || type == '入库';
  bool get isStockOut => type == 'stock_out' || type == '出库';
}

class WarehouseAlert {
  final String materialId;
  final String materialName;
  final String type;
  final double currentStock;
  final double threshold;

  WarehouseAlert({
    required this.materialId,
    required this.materialName,
    required this.type,
    required this.currentStock,
    required this.threshold,
  });

  factory WarehouseAlert.fromJson(Map<String, dynamic> json) {
    return WarehouseAlert(
      materialId: json['material_id'] ?? json['materialId'] ?? '',
      materialName: json['material_name'] ?? json['materialName'] ?? '',
      type: json['type'] ?? '',
      currentStock: (json['current_stock'] ?? json['currentStock'] ?? 0).toDouble(),
      threshold: (json['threshold'] ?? 0).toDouble(),
    );
  }
}
