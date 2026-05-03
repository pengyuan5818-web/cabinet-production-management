class Order {
  final String id;
  final String orderNo;
  final String customerName;
  final String dealerName;
  final String status;
  final String currentStage;
  final double totalAmount;
  final double paidAmount;
  final DateTime createdAt;
  final DateTime? deliveryDate;
  final List<OrderStage> stages;

  Order({
    required this.id,
    required this.orderNo,
    required this.customerName,
    required this.dealerName,
    required this.status,
    required this.currentStage,
    required this.totalAmount,
    required this.paidAmount,
    required this.createdAt,
    this.deliveryDate,
    this.stages = const [],
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      orderNo: json['order_no'] ?? json['orderNo'] ?? '',
      customerName: json['customer_name'] ?? json['customerName'] ?? '',
      dealerName: json['dealer_name'] ?? json['dealerName'] ?? '',
      status: json['status'] ?? '',
      currentStage: json['current_stage'] ?? json['currentStage'] ?? '',
      totalAmount: (json['total_amount'] ?? json['totalAmount'] ?? 0).toDouble(),
      paidAmount: (json['paid_amount'] ?? json['paidAmount'] ?? 0).toDouble(),
      createdAt: DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') ?? DateTime.now(),
      deliveryDate: json['delivery_date'] != null ? DateTime.tryParse(json['delivery_date']) : null,
      stages: (json['stages'] as List<dynamic>?)
          ?.map((s) => OrderStage.fromJson(s))
          .toList() ?? [],
    );
  }

  double get unpaidAmount => totalAmount - paidAmount;
}

class OrderStage {
  final String name;
  final String status;
  final DateTime? startTime;
  final DateTime? endTime;

  OrderStage({
    required this.name,
    required this.status,
    this.startTime,
    this.endTime,
  });

  factory OrderStage.fromJson(Map<String, dynamic> json) {
    return OrderStage(
      name: json['name'] ?? '',
      status: json['status'] ?? '',
      startTime: json['start_time'] != null ? DateTime.tryParse(json['start_time']) : null,
      endTime: json['end_time'] != null ? DateTime.tryParse(json['end_time']) : null,
    );
  }

  bool get isCompleted => status == 'completed' || status == '已完成';
  bool get isInProgress => status == 'in_progress' || status == '进行中';
}
