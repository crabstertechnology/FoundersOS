import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../services/firebase_service.dart';
import '../../models/models.dart';

class OperationsSuiteTab extends StatefulWidget {
  const OperationsSuiteTab({super.key});

  @override
  State<OperationsSuiteTab> createState() => _OperationsSuiteTabState();
}

class _OperationsSuiteTabState extends State<OperationsSuiteTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Runway Simulation State
  double _simCashBank = 0.0;
  double _simBurnRate = 0.0;
  double _simRevenue = 0.0;
  bool _initializedProjections = false;

  // Task Manager State
  String _selectedPriorityFilter = 'all';
  String _selectedStatusFilter = 'all';
  final _taskTitleController = TextEditingController();
  final _taskDescController = TextEditingController();
  String _taskPriority = 'medium';
  String _taskStatus = 'todo';
  String _assignedName = '';
  DateTime? _taskDueDate;

  // Chat Room State
  final _chatController = TextEditingController();
  final _chatScrollController = ScrollController();
  bool _isTypingLocal = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final profile = Provider.of<FirebaseService>(context, listen: false).currentProfile;
      if (profile != null) {
        setState(() {
          _simCashBank = profile.cashBank;
          _simBurnRate = profile.burnRate;
          _simRevenue = profile.mRevenue;
          _initializedProjections = true;
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _taskTitleController.dispose();
    _taskDescController.dispose();
    _chatController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  String _formatINR(double val) {
    final format = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return format.format(val);
  }

  // -----------------------------------------------------------------
  // Encryption Helpers (XOR cipher)
  // -----------------------------------------------------------------
  String _encryptText(String text, String key) {
    if (text.isEmpty) return '';
    final xorCodes = List<int>.generate(text.length, (i) {
      return text.codeUnitAt(i) ^ key.codeUnitAt(i % key.length);
    });
    final xorString = String.fromCharCodes(xorCodes);
    return "[E2EE] ${base64.encode(utf8.encode(xorString))}";
  }

  String _decryptText(String encrypted, String key) {
    if (encrypted.isEmpty) return '';
    if (!encrypted.startsWith('[E2EE] ')) return encrypted;
    try {
      final base64Str = encrypted.replaceFirst('[E2EE] ', '');
      final xorString = utf8.decode(base64.decode(base64Str));
      final decryptedCodes = List<int>.generate(xorString.length, (i) {
        return xorString.codeUnitAt(i) ^ key.codeUnitAt(i % key.length);
      });
      return String.fromCharCodes(decryptedCodes);
    } catch (e) {
      return '[Decryption Error]';
    }
  }

  // -----------------------------------------------------------------
  // Task Board Mutations
  // -----------------------------------------------------------------
  void _addTaskAction(FirebaseService service) async {
    if (_taskTitleController.text.isEmpty) return;

    final newTask = CompanyTask(
      id: '',
      title: _taskTitleController.text.trim(),
      description: _taskDescController.text.trim(),
      status: _taskStatus,
      priority: _taskPriority,
      assignedToUid: '',
      assignedToName: _assignedName.trim().isEmpty ? 'Unassigned' : _assignedName.trim(),
      assignedToEmail: '',
      dueDate: _taskDueDate,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await service.addTask(newTask);

    _taskTitleController.clear();
    _taskDescController.clear();
    setState(() {
      _taskPriority = 'medium';
      _taskStatus = 'todo';
      _assignedName = '';
      _taskDueDate = null;
    });

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task registered successfully!'), backgroundColor: Colors.teal),
      );
    }
  }

  void _updateTaskStatus(FirebaseService service, CompanyTask task, String newStatus) async {
    await service.updateTask(task.id, {'status': newStatus});
  }

  // -----------------------------------------------------------------
  // Chat Actions
  // -----------------------------------------------------------------
  void _sendChatMessageAction(FirebaseService service, String profileId) async {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;

    _chatController.clear();
    service.setTypingState(false);
    _isTypingLocal = false;

    // Encrypt the message text
    final encrypted = _encryptText(text, profileId);

    await service.sendChatMessage(encrypted);

    // Scroll to end
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _onChatInputChange(FirebaseService service, String val) {
    if (val.trim().isNotEmpty && !_isTypingLocal) {
      _isTypingLocal = true;
      service.setTypingState(true);
    } else if (val.trim().isEmpty && _isTypingLocal) {
      _isTypingLocal = false;
      service.setTypingState(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);
    final profile = firebaseService.currentProfile;

    if (profile == null) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)));
    }

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090D16),
        title: const Text(
          'OPERATIONS HUB',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF06B6D4),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF06B6D4),
          tabs: const [
            Tab(text: 'Runway Sim', icon: Icon(LucideIcons.hourglass)),
            Tab(text: 'Task Board', icon: Icon(LucideIcons.checkSquare)),
            Tab(text: 'Team Chat', icon: Icon(LucideIcons.messageSquare)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRunwayTab(),
          _buildTasksTab(firebaseService),
          _buildChatTab(firebaseService, profile.id),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 1: Runway Projections Simulator
  // -----------------------------------------------------------------
  Widget _buildRunwayTab() {
    if (!_initializedProjections) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)));
    }

    final double netBurn = (_simBurnRate - _simRevenue).clamp(0.0, double.infinity);
    final double projectedRunway = netBurn > 0 ? (_simCashBank / netBurn) : 99.0;

    // Projected Monthly schedule
    final schedule = <Map<String, dynamic>>[];
    double currentCash = _simCashBank;
    for (int month = 1; month <= 12; month++) {
      double starting = currentCash;
      currentCash = (currentCash - netBurn).clamp(0.0, double.infinity);
      schedule.add({
        'month': 'Month $month',
        'starting': starting,
        'ending': currentCash,
        'status': currentCash > 0 ? 'Healthy' : 'OUT OF CASH',
      });
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Projections Overview
          _buildCard(
            title: 'Projected cash runway status',
            icon: LucideIcons.hourglass,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('NET BURN RATE', style: TextStyle(color: Colors.grey, fontSize: 10)),
                        Text(_formatINR(netBurn), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('RUNWAY DURATION', style: TextStyle(color: Colors.grey, fontSize: 10)),
                        Text(
                          projectedRunway >= 99 ? '99+ mos (Break-even)' : '${projectedRunway.toStringAsFixed(1)} mos',
                          style: TextStyle(
                            color: projectedRunway < 6 ? Colors.redAccent : Colors.tealAccent,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (projectedRunway < 6) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(color: Colors.redAccent.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                    child: const Row(
                      children: [
                        Icon(LucideIcons.alertTriangle, color: Colors.redAccent, size: 14),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Warning: Cash runway is below the 6-month threshold. Capital preservation or funding is required.',
                            style: TextStyle(color: Colors.white70, fontSize: 10),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Projections Sliders
          _buildCard(
            title: 'Simulate Cash Scenarios',
            icon: LucideIcons.sliders,
            child: Column(
              children: [
                _buildSliderRow(
                  'Cash in Bank',
                  _simCashBank,
                  0.0,
                  20000000.0,
                  (v) => setState(() => _simCashBank = v),
                ),
                _buildSliderRow(
                  'Monthly Operating Burn',
                  _simBurnRate,
                  0.0,
                  2000000.0,
                  (v) => setState(() => _simBurnRate = v),
                ),
                _buildSliderRow(
                  'Monthly Revenue Contribution',
                  _simRevenue,
                  0.0,
                  2000000.0,
                  (v) => setState(() => _simRevenue = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Projected Waterfall schedule
          _buildCard(
            title: '12-Month Liquidity Forecast',
            icon: LucideIcons.calendar,
            child: ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: schedule.length,
              itemBuilder: (context, index) {
                final item = schedule[index];
                final double ending = item['ending'];
                final isZero = ending <= 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isZero ? Colors.redAccent.withOpacity(0.05) : Colors.white.withOpacity(0.015),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isZero ? Colors.redAccent.withOpacity(0.2) : Colors.white.withOpacity(0.05)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item['month'], style: TextStyle(color: isZero ? Colors.redAccent : Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(_formatINR(ending), style: TextStyle(color: isZero ? Colors.redAccent : Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                          Text(item['status'], style: TextStyle(color: isZero ? Colors.redAccent : Colors.grey, fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSliderRow(String label, double value, double min, double max, ValueChanged<double> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
              Text(_formatINR(value), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
            ],
          ),
          Slider(
            value: value.clamp(min, max),
            min: min,
            max: max,
            activeColor: const Color(0xFF06B6D4),
            inactiveColor: Colors.white10,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 2: Task Workspace
  // -----------------------------------------------------------------
  Widget _buildTasksTab(FirebaseService service) {
    final rawTasks = service.tasks;

    final filteredTasks = rawTasks.where((t) {
      if (_selectedPriorityFilter != 'all' && t.priority != _selectedPriorityFilter) return false;
      if (_selectedStatusFilter != 'all' && t.status != _selectedStatusFilter) return false;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF4F46E5),
        child: const Icon(LucideIcons.plus, color: Colors.white),
        onPressed: () => _showAddTaskDialog(context, service),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Filters Row
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    dropdownColor: const Color(0xFF090D16),
                    value: _selectedStatusFilter,
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All Statuses', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'todo', child: Text('Todo', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'in-progress', child: Text('In Progress', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'in-review', child: Text('In Review', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'completed', child: Text('Completed', style: TextStyle(color: Colors.greenAccent, fontSize: 12))),
                    ],
                    onChanged: (v) => setState(() => _selectedStatusFilter = v!),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white10)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    dropdownColor: const Color(0xFF090D16),
                    value: _selectedPriorityFilter,
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All Priorities', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'low', child: Text('Low', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'medium', child: Text('Medium', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'high', child: Text('High', style: TextStyle(color: Colors.white, fontSize: 12))),
                      DropdownMenuItem(value: 'urgent', child: Text('Urgent', style: TextStyle(color: Colors.redAccent, fontSize: 12))),
                    ],
                    onChanged: (v) => setState(() => _selectedPriorityFilter = v!),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white10)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Tasks List
            Expanded(
              child: filteredTasks.isEmpty
                  ? const Center(child: Text('No tasks registered in this workspace.', style: TextStyle(color: Colors.grey, fontSize: 12)))
                  : ListView.builder(
                      itemCount: filteredTasks.length,
                      itemBuilder: (context, index) {
                        final task = filteredTasks[index];
                        return Card(
                          color: Colors.white.withOpacity(0.015),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.white.withOpacity(0.05))),
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        task.title,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          decoration: task.status == 'completed' ? TextDecoration.lineThrough : null,
                                        ),
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        _priorityBadge(task.priority),
                                        const SizedBox(width: 6),
                                        IconButton(
                                          icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 16),
                                          onPressed: () => service.deleteTask(task.id),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                if (task.description.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(task.description, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                ],
                                const SizedBox(height: 12),
                                const Divider(color: Colors.white10),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Assignee: ${task.assignedToName}', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                    DropdownButton<String>(
                                      dropdownColor: const Color(0xFF090D16),
                                      value: task.status,
                                      underline: const SizedBox(),
                                      items: const [
                                        DropdownMenuItem(value: 'todo', child: Text('TODO', style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold))),
                                        DropdownMenuItem(value: 'in-progress', child: Text('IN PROGRESS', style: TextStyle(color: Colors.blueAccent, fontSize: 10, fontWeight: FontWeight.bold))),
                                        DropdownMenuItem(value: 'in-review', child: Text('IN REVIEW', style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold))),
                                        DropdownMenuItem(value: 'completed', child: Text('COMPLETED', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold))),
                                      ],
                                      onChanged: (v) {
                                        if (v != null) {
                                          _updateTaskStatus(service, task, v);
                                        }
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _priorityBadge(String priority) {
    Color color = Colors.grey;
    if (priority == 'low') color = Colors.blue;
    if (priority == 'high') color = Colors.orange;
    if (priority == 'urgent') color = Colors.redAccent;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(color: color, fontSize: 8, fontWeight: FontWeight.bold),
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 3: Team E2EE Chat Room
  // -----------------------------------------------------------------
  Widget _buildChatTab(FirebaseService service, String profileId) {
    final messages = service.messages;
    final presence = service.presence;

    // Find who is online
    final onlineUsers = presence.where((p) => p['status'] == 'online').toList();
    final typingUsers = presence.where((p) => p['uid'] != service.currentUser?.uid && p['isTyping'] == true).toList();

    return Column(
      children: [
        // Real-time online presence status bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.01),
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
          ),
          child: Row(
            children: [
              const Icon(LucideIcons.users, color: Colors.grey, size: 14),
              const SizedBox(width: 8),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: onlineUsers.map((p) {
                      final isSelf = p['uid'] == service.currentUser?.uid;
                      final isTyping = p['isTyping'] == true;
                      return Padding(
                        padding: const EdgeInsets.only(right: 12.0),
                        child: Row(
                          children: [
                            Container(
                              height: 6,
                              width: 6,
                              decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              isSelf ? 'You (Admin)' : p['name'],
                              style: TextStyle(color: isTyping ? Colors.tealAccent : Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                            if (isTyping) ...[
                              const SizedBox(width: 2),
                              const Text('is typing...', style: TextStyle(color: Colors.tealAccent, fontSize: 8, fontStyle: FontStyle.italic)),
                            ],
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Messages list
        Expanded(
          child: messages.isEmpty
              ? const Center(child: Text('Chat room active. All messages encrypted with E2EE.', style: TextStyle(color: Colors.grey, fontSize: 12)))
              : ListView.builder(
                  controller: _chatScrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isSelf = msg.senderUid == service.currentUser?.uid;
                    final decryptedText = _decryptText(msg.text, profileId);

                    return Align(
                      alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: Row(
                          mainAxisAlignment: isSelf ? MainAxisAlignment.end : MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (!isSelf) ...[
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: const Color(0xFF4F46E5),
                                child: Text(
                                  msg.senderName.substring(0, 1).toUpperCase(),
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Column(
                              crossAxisAlignment: isSelf ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                              children: [
                                if (!isSelf)
                                  Text(msg.senderName, style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold)),
                                Container(
                                  margin: const EdgeInsets.only(top: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: isSelf ? const Color(0xFF4F46E5) : Colors.white.withOpacity(0.04),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        constraints: const BoxConstraints(maxWidth: 240),
                                        child: Text(
                                          decryptedText,
                                          style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.3),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),

        // Typing overlay helper
        if (typingUsers.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '${typingUsers.map((u) => u['name']).join(', ')} is typing...',
                style: const TextStyle(color: Colors.tealAccent, fontSize: 9, fontStyle: FontStyle.italic),
              ),
            ),
          ),

        // Input Box
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _chatController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Encrypt and send E2EE message...',
                    hintStyle: const TextStyle(color: Colors.grey, fontSize: 12),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.02),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: Colors.white10)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: Color(0xFF06B6D4))),
                  ),
                  onChanged: (val) => _onChatInputChange(service, val),
                  onSubmitted: (_) => _sendChatMessageAction(service, profileId),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                backgroundColor: const Color(0xFF06B6D4),
                child: IconButton(
                  icon: const Icon(LucideIcons.send, color: Colors.white, size: 16),
                  onPressed: () => _sendChatMessageAction(service, profileId),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // -----------------------------------------------------------------
  // Dialog: Add Task Dialog
  // -----------------------------------------------------------------
  void _showAddTaskDialog(BuildContext context, FirebaseService service) {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFF090D16),
              title: const Text('Add Milestone Task', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildFieldInput('Task Title', _taskTitleController),
                  const SizedBox(height: 12),
                  _buildFieldInput('Description', _taskDescController),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          dropdownColor: const Color(0xFF090D16),
                          value: _taskPriority,
                          items: const [
                            DropdownMenuItem(value: 'low', child: Text('Low', style: TextStyle(color: Colors.white))),
                            DropdownMenuItem(value: 'medium', child: Text('Medium', style: TextStyle(color: Colors.white))),
                            DropdownMenuItem(value: 'high', child: Text('High', style: TextStyle(color: Colors.white))),
                            DropdownMenuItem(value: 'urgent', child: Text('Urgent', style: TextStyle(color: Colors.redAccent))),
                          ],
                          onChanged: (v) => setStateDialog(() => _taskPriority = v!),
                          decoration: const InputDecoration(labelText: 'Priority', labelStyle: TextStyle(color: Colors.grey, fontSize: 10)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          dropdownColor: const Color(0xFF090D16),
                          value: _taskStatus,
                          items: const [
                            DropdownMenuItem(value: 'todo', child: Text('Todo', style: TextStyle(color: Colors.white))),
                            DropdownMenuItem(value: 'in-progress', child: Text('In Progress', style: TextStyle(color: Colors.white))),
                            DropdownMenuItem(value: 'in-review', child: Text('In Review', style: TextStyle(color: Colors.white))),
                          ],
                          onChanged: (v) => setStateDialog(() => _taskStatus = v!),
                          decoration: const InputDecoration(labelText: 'Status', labelStyle: TextStyle(color: Colors.grey, fontSize: 10)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: _assignedName.isEmpty ? 'Assignee Name' : _assignedName,
                            hintStyle: const TextStyle(color: Colors.grey),
                          ),
                          onChanged: (val) => setStateDialog(() => _assignedName = val),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          child: Text(
                            _taskDueDate == null ? 'Due Date' : DateFormat('MM/dd').format(_taskDueDate!),
                            style: const TextStyle(color: Colors.white, fontSize: 11),
                          ),
                          onPressed: () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now(),
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (d != null) {
                              setStateDialog(() => _taskDueDate = d);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () => _addTaskAction(service),
                  child: const Text('Create Task'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // -----------------------------------------------------------------
  // General UI Helper widgets
  // -----------------------------------------------------------------
  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.015),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF06B6D4), size: 18),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.0),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildFieldInput(String label, TextEditingController controller, {TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.grey, fontSize: 12),
        filled: true,
        fillColor: Colors.white.withOpacity(0.01),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white10)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
      ),
    );
  }
}
