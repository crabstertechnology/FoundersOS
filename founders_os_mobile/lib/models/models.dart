import 'package:cloud_firestore/cloud_firestore.dart';

class Shareholder {
  final String id;
  final String name;
  final String role; // Founder, Investor, ESOP, Advisor, Partner
  final double ownership; // percentage
  final double invested; // in INR
  final String preferenceType; // common, 1x_non_part, 1x_part, 2x_part

  Shareholder({
    required this.id,
    required this.name,
    required this.role,
    required this.ownership,
    required this.invested,
    required this.preferenceType,
  });

  factory Shareholder.fromMap(String id, Map<String, dynamic> data) {
    return Shareholder(
      id: id,
      name: data['name'] ?? 'Unknown',
      role: data['role'] ?? 'Investor',
      ownership: (data['ownershipPercentage'] ?? data['ownership'] ?? 0).toDouble(),
      invested: (data['investmentAmount'] ?? data['invested'] ?? 0).toDouble(),
      preferenceType: data['preferenceType'] ?? (data['role'] == 'Founder' ? 'common' : '1x_non_part'),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'role': role,
      'ownershipPercentage': ownership,
      'investmentAmount': invested,
      'preferenceType': preferenceType,
    };
  }
}

class HistoryEntry {
  final String id;
  final DateTime timestamp;
  final String changedBy;
  final String note;
  final Map<String, dynamic>? snapshot;

  HistoryEntry({
    required this.id,
    required this.timestamp,
    required this.changedBy,
    required this.note,
    this.snapshot,
  });

  factory HistoryEntry.fromMap(Map<String, dynamic> data) {
    DateTime time;
    if (data['timestamp'] is Timestamp) {
      time = (data['timestamp'] as Timestamp).toDate();
    } else if (data['timestamp'] is String) {
      time = DateTime.tryParse(data['timestamp']) ?? DateTime.now();
    } else {
      time = DateTime.now();
    }

    return HistoryEntry(
      id: data['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      timestamp: time,
      changedBy: data['changedBy'] ?? 'System',
      note: data['note'] ?? '',
      snapshot: data['snapshot'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'timestamp': Timestamp.fromDate(timestamp),
      'changedBy': changedBy,
      'note': note,
      if (snapshot != null) 'snapshot': snapshot,
    };
  }
}

class EZLead {
  final String id;
  final DateTime date;
  final String leadType; // school, college, student, other
  final String organization;
  final String contactPerson;
  final String phone;
  final String email;
  final String source; // cold-call, referral, instagram, whatsapp, website, event, other
  final String requirement;
  final String status; // new-lead, contacting, demo-scheduled, proposal-sent, negotiating, closed-won, closed-lost
  final String nextAction;
  final DateTime? followUpDate;
  final double expectedRevenue;
  final double actualRevenue;
  final String remarks;
  final List<HistoryEntry> history;
  final DateTime createdAt;
  final DateTime updatedAt;

  EZLead({
    required this.id,
    required this.date,
    required this.leadType,
    required this.organization,
    required this.contactPerson,
    required this.phone,
    required this.email,
    required this.source,
    required this.requirement,
    required this.status,
    required this.nextAction,
    this.followUpDate,
    required this.expectedRevenue,
    required this.actualRevenue,
    required this.remarks,
    required this.history,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EZLead.fromMap(Map<String, dynamic> data) {
    DateTime parseDate(dynamic d) {
      if (d is Timestamp) return d.toDate();
      if (d is String) return DateTime.tryParse(d) ?? DateTime.now();
      return DateTime.now();
    }

    DateTime? parseNullableDate(dynamic d) {
      if (d == null) return null;
      if (d is Timestamp) return d.toDate();
      if (d is String) return DateTime.tryParse(d);
      return null;
    }

    var historyList = <HistoryEntry>[];
    if (data['history'] is List) {
      historyList = (data['history'] as List)
          .map((h) => HistoryEntry.fromMap(Map<String, dynamic>.from(h)))
          .toList();
    }

    return EZLead(
      id: data['id'] ?? '',
      date: parseDate(data['date']),
      leadType: data['leadType'] ?? 'other',
      organization: data['organization'] ?? '',
      contactPerson: data['contactPerson'] ?? '',
      phone: data['phone'] ?? '',
      email: data['email'] ?? '',
      source: data['source'] ?? 'other',
      requirement: data['requirement'] ?? '',
      status: data['status'] ?? 'new-lead',
      nextAction: data['nextAction'] ?? '',
      followUpDate: parseNullableDate(data['followUpDate']),
      expectedRevenue: (data['expectedRevenue'] ?? 0).toDouble(),
      actualRevenue: (data['actualRevenue'] ?? 0).toDouble(),
      remarks: data['remarks'] ?? '',
      history: historyList,
      createdAt: parseDate(data['createdAt']),
      updatedAt: parseDate(data['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': Timestamp.fromDate(date),
      'leadType': leadType,
      'organization': organization,
      'contactPerson': contactPerson,
      'phone': phone,
      'email': email,
      'source': source,
      'requirement': requirement,
      'status': status,
      'nextAction': nextAction,
      'followUpDate': followUpDate != null ? Timestamp.fromDate(followUpDate!) : null,
      'expectedRevenue': expectedRevenue,
      'actualRevenue': actualRevenue,
      'remarks': remarks,
      'history': history.map((h) => h.toMap()).toList(),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}

class CompanyTask {
  final String id;
  final String title;
  final String description;
  final String status; // todo, in-progress, in-review, completed
  final String priority; // low, medium, high, urgent
  final String assignedToUid;
  final String assignedToName;
  final String assignedToEmail;
  final DateTime? dueDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  CompanyTask({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.assignedToUid,
    required this.assignedToName,
    required this.assignedToEmail,
    this.dueDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CompanyTask.fromMap(String id, Map<String, dynamic> data) {
    DateTime parseDate(dynamic d) {
      if (d is Timestamp) return d.toDate();
      if (d is String) return DateTime.tryParse(d) ?? DateTime.now();
      return DateTime.now();
    }

    DateTime? parseNullableDate(dynamic d) {
      if (d == null) return null;
      if (d is Timestamp) return d.toDate();
      if (d is String) return DateTime.tryParse(d);
      return null;
    }

    return CompanyTask(
      id: id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: data['status'] ?? 'todo',
      priority: data['priority'] ?? 'medium',
      assignedToUid: data['assignedToUid'] ?? '',
      assignedToName: data['assignedToName'] ?? '',
      assignedToEmail: data['assignedToEmail'] ?? '',
      dueDate: parseNullableDate(data['dueDate']),
      createdAt: parseDate(data['createdAt']),
      updatedAt: parseDate(data['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'assignedToUid': assignedToUid,
      'assignedToName': assignedToName,
      'assignedToEmail': assignedToEmail,
      'dueDate': dueDate != null ? Timestamp.fromDate(dueDate!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}

class ChatMessage {
  final String id;
  final String senderUid;
  final String senderName;
  final String senderEmail;
  final String text;
  final bool isEncrypted;
  final DateTime createdAt;
  final List<String> readBy;
  final String? mediaName;
  final String? mediaType; // image, document
  final int? mediaSize;
  final String? mediaUrl;

  ChatMessage({
    required this.id,
    required this.senderUid,
    required this.senderName,
    required this.senderEmail,
    required this.text,
    required this.isEncrypted,
    required this.createdAt,
    required this.readBy,
    this.mediaName,
    this.mediaType,
    this.mediaSize,
    this.mediaUrl,
  });

  factory ChatMessage.fromMap(String id, Map<String, dynamic> data) {
    DateTime parseDate(dynamic d) {
      if (d is Timestamp) return d.toDate();
      if (d is String) return DateTime.tryParse(d) ?? DateTime.now();
      return DateTime.now();
    }

    var readByList = <String>[];
    if (data['readBy'] is List) {
      readByList = List<String>.from(data['readBy']);
    }

    return ChatMessage(
      id: id,
      senderUid: data['senderUid'] ?? data['senderId'] ?? '',
      senderName: data['senderName'] ?? 'User',
      senderEmail: data['senderEmail'] ?? '',
      text: data['text'] ?? '',
      isEncrypted: data['isEncrypted'] ?? false,
      createdAt: parseDate(data['createdAt']),
      readBy: readByList,
      mediaName: data['mediaName'],
      mediaType: data['mediaType'],
      mediaSize: data['mediaSize'],
      mediaUrl: data['mediaUrl'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'senderUid': senderUid,
      'senderName': senderName,
      'senderEmail': senderEmail,
      'text': text,
      'isEncrypted': isEncrypted,
      'createdAt': Timestamp.fromDate(createdAt),
      'readBy': readBy,
      if (mediaName != null) 'mediaName': mediaName,
      if (mediaType != null) 'mediaType': mediaType,
      if (mediaSize != null) 'mediaSize': mediaSize,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
    };
  }
}

class CompanyProfile {
  final String id;
  final String companyName;
  final String stage;
  final String industry;
  final double mRevenue;
  final double growthRate;
  final double burnRate;
  final double cashBank;
  final double customers;
  final double profitPerOrder;
  final double ordersPerCustomer;
  final double cac;
  final double investment;
  final double equityOffered;
  final double esopPool;
  final double advisorEquity;
  final double coFounderEq;
  final String prefMultiple;
  final String prefType;
  final double latestValuation;
  final double postMoneyValuation;
  final List<EZLead> ezLeads;

  CompanyProfile({
    required this.id,
    required this.companyName,
    required this.stage,
    required this.industry,
    required this.mRevenue,
    required this.growthRate,
    required this.burnRate,
    required this.cashBank,
    required this.customers,
    required this.profitPerOrder,
    required this.ordersPerCustomer,
    required this.cac,
    required this.investment,
    required this.equityOffered,
    required this.esopPool,
    required this.advisorEquity,
    required this.coFounderEq,
    required this.prefMultiple,
    required this.prefType,
    required this.latestValuation,
    required this.postMoneyValuation,
    required this.ezLeads,
  });

  factory CompanyProfile.fromMap(String id, Map<String, dynamic> data) {
    var leads = <EZLead>[];
    if (data['ezLeads'] is List) {
      leads = (data['ezLeads'] as List)
          .map((l) => EZLead.fromMap(Map<String, dynamic>.from(l)))
          .toList();
    }

    return CompanyProfile(
      id: id,
      companyName: data['companyName'] ?? '',
      stage: data['stage'] ?? 'idea',
      industry: data['industry'] ?? 'saas',
      mRevenue: (data['mRevenue'] ?? 0).toDouble(),
      growthRate: (data['growthRate'] ?? 0).toDouble(),
      burnRate: (data['burnRate'] ?? 0).toDouble(),
      cashBank: (data['cashBank'] ?? 0).toDouble(),
      customers: (data['customers'] ?? 0).toDouble(),
      profitPerOrder: (data['profitPerOrder'] ?? 0).toDouble(),
      ordersPerCustomer: (data['ordersPerCustomer'] ?? 1).toDouble(),
      cac: (data['cac'] ?? 0).toDouble(),
      investment: (data['investment'] ?? 0).toDouble(),
      equityOffered: (data['equityOffered'] ?? 0).toDouble(),
      esopPool: (data['esopPool'] ?? 10).toDouble(),
      advisorEquity: (data['advisorEquity'] ?? 0).toDouble(),
      coFounderEq: (data['coFounderEq'] ?? 0).toDouble(),
      prefMultiple: (data['prefMultiple'] ?? '1').toString(),
      prefType: data['prefType'] ?? 'nonparticipating',
      latestValuation: (data['latestValuation'] ?? 0).toDouble(),
      postMoneyValuation: (data['postMoneyValuation'] ?? 0).toDouble(),
      ezLeads: leads,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'companyName': companyName,
      'stage': stage,
      'industry': industry,
      'mRevenue': mRevenue,
      'growthRate': growthRate,
      'burnRate': burnRate,
      'cashBank': cashBank,
      'customers': customers,
      'profitPerOrder': profitPerOrder,
      'ordersPerCustomer': ordersPerCustomer,
      'cac': cac,
      'investment': investment,
      'equityOffered': equityOffered,
      'esopPool': esopPool,
      'advisorEquity': advisorEquity,
      'coFounderEq': coFounderEq,
      'prefMultiple': prefMultiple,
      'prefType': prefType,
      'latestValuation': latestValuation,
      'postMoneyValuation': postMoneyValuation,
      'ezLeads': ezLeads.map((l) => l.toMap()).toList(),
    };
  }
}
