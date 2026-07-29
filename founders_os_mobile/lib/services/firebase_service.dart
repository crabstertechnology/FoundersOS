import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/models.dart';

class FirebaseService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? _currentUser;
  CompanyProfile? _currentProfile;
  List<Shareholder> _shareholders = [];
  List<CompanyTask> _tasks = [];
  List<ChatMessage> _messages = [];
  List<Map<String, dynamic>> _fundingRounds = [];
  List<Map<String, dynamic>> _presence = [];

  bool _isLoading = false;
  String? _errorMessage;

  StreamSubscription? _profileSub;
  StreamSubscription? _shareholderSub;
  StreamSubscription? _tasksSub;
  StreamSubscription? _messagesSub;
  StreamSubscription? _roundsSub;
  StreamSubscription? _presenceSub;
  Timer? _presenceTimer;

  // Getters
  User? get currentUser => _currentUser;
  CompanyProfile? get currentProfile => _currentProfile;
  List<Shareholder> get shareholders => _shareholders;
  List<CompanyTask> get tasks => _tasks;
  List<ChatMessage> get messages => _messages;
  List<Map<String, dynamic>> get fundingRounds => _fundingRounds;
  List<Map<String, dynamic>> get presence => _presence;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _currentUser != null;

  FirebaseService() {
    _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  static Future<void> initialize() async {
    WidgetsFlutterBinding.ensureInitialized();
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: "AIzaSyAdVdjbrf8KO5TqEx6JsMxqkD_SaR3Sqdk",
        authDomain: "studio-5418824271-71a21.firebaseapp.com",
        projectId: "studio-5418824271-71a21",
        storageBucket: "studio-5418824271-71a21.appspot.com",
        messagingSenderId: "337798796195",
        appId: "1:337798796195:web:91b12a0ea1fce3e3b64016",
      ),
    );
  }

  // -----------------------------------------------------------------
  // Auth Functions
  // -----------------------------------------------------------------
  Future<bool> signInAnonymously() async {
    _setLoading(true);
    _clearError();
    try {
      await _auth.signInAnonymously();
      return true;
    } on FirebaseAuthException catch (e) {
      _setError(e.message ?? 'An unknown authentication error occurred.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> signInWithEmail(String email, String password) async {
    _setLoading(true);
    _clearError();
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
      return true;
    } on FirebaseAuthException catch (e) {
      _setError(e.message ?? 'Sign-in failed.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> registerWithEmail(String email, String password, String name) async {
    _setLoading(true);
    _clearError();
    try {
      UserCredential cred = await _auth.createUserWithEmailAndPassword(email: email, password: password);
      await cred.user?.updateDisplayName(name);
      // Force trigger state reload
      _currentUser = _auth.currentUser;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      _setError(e.message ?? 'Registration failed.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> signOut() async {
    _setLoading(true);
    _cancelSubscriptions();
    _updatePresence(status: 'offline', isTyping: false);
    _presenceTimer?.cancel();
    await _auth.signOut();
    _currentUser = null;
    _currentProfile = null;
    _shareholders = [];
    _tasks = [];
    _messages = [];
    _fundingRounds = [];
    _presence = [];
    _setLoading(false);
  }

  void _onAuthStateChanged(User? user) {
    _currentUser = user;
    if (user != null) {
      _setupListeners(user.uid);
    } else {
      _cancelSubscriptions();
    }
    notifyListeners();
  }

  // -----------------------------------------------------------------
  // Sync / Listeners Setup
  // -----------------------------------------------------------------
  void _setupListeners(String uid) {
    _cancelSubscriptions();

    final profileRef = _db.collection('users').doc(uid).collection('companyProfiles').doc('primary-startup');

    // 1. Listen to Profile Document
    _profileSub = profileRef.snapshots().listen((snapshot) {
      if (snapshot.exists) {
        _currentProfile = CompanyProfile.fromMap(snapshot.id, snapshot.data()!);
      } else {
        // Document doesn't exist, seed default values
        _seedDefaultProfile(uid);
      }
      notifyListeners();
    }, onError: (e) {
      if (kDebugMode) print("Profile sub error: $e");
    });

    // 2. Listen to Shareholders
    _shareholderSub = profileRef.collection('shareholders').snapshots().listen((snapshot) {
      _shareholders = snapshot.docs.map((doc) => Shareholder.fromMap(doc.id, doc.data())).toList();
      notifyListeners();
    }, onError: (e) {
      if (kDebugMode) print("Shareholder sub error: $e");
    });

    // 3. Listen to Tasks
    _tasksSub = profileRef.collection('tasks').orderBy('createdAt', descending: true).snapshots().listen((snapshot) {
      _tasks = snapshot.docs.map((doc) => CompanyTask.fromMap(doc.id, doc.data())).toList();
      notifyListeners();
    }, onError: (e) {
      if (kDebugMode) print("Tasks sub error: $e");
    });

    // 4. Listen to Chat Messages
    _messagesSub = profileRef.collection('teamChats').orderBy('createdAt', descending: false).snapshots().listen((snapshot) {
      _messages = snapshot.docs.map((doc) => ChatMessage.fromMap(doc.id, doc.data())).toList();
      _markMessagesAsRead(profileRef.collection('teamChats'));
      notifyListeners();
    }, onError: (e) {
      if (kDebugMode) print("Messages sub error: $e");
    });

    // 5. Listen to Funding Rounds
    _roundsSub = profileRef.collection('fundingRounds').orderBy('date', descending: true).snapshots().listen((snapshot) {
      _fundingRounds = snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList();
      notifyListeners();
    }, onError: (e) {
      if (kDebugMode) print("Rounds sub error: $e");
    });

    // 6. Listen to Presence
    _presenceSub = profileRef.collection('presence').snapshots().listen((snapshot) {
      _presence = snapshot.docs.map((doc) => doc.data()).toList();
      notifyListeners();
    }, onError: (e) {
      if (kDebugMode) print("Presence sub error: $e");
    });

    // Start online presence pulse
    _updatePresence(status: 'online', isTyping: false);
    _presenceTimer = Timer.periodic(const Duration(seconds: 20), (timer) {
      _updatePresence(status: 'online', isTyping: false);
    });
  }

  void _cancelSubscriptions() {
    _profileSub?.cancel();
    _shareholderSub?.cancel();
    _tasksSub?.cancel();
    _messagesSub?.cancel();
    _roundsSub?.cancel();
    _presenceSub?.cancel();
    _presenceTimer?.cancel();
  }

  // -----------------------------------------------------------------
  // Seeding Default Profile Data
  // -----------------------------------------------------------------
  Future<void> _seedDefaultProfile(String uid) async {
    final profileRef = _db.collection('users').doc(uid).collection('companyProfiles').doc('primary-startup');
    final defaultProfile = {
      'companyName': 'My Startup',
      'stage': 'idea',
      'industry': 'saas',
      'mRevenue': 100000.0,
      'growthRate': 15.0,
      'burnRate': 50000.0,
      'cashBank': 500000.0,
      'customers': 50.0,
      'profitPerOrder': 1200.0,
      'ordersPerCustomer': 2.0,
      'cac:': 400.0,
      'investment': 2500000.0,
      'equityOffered': 10.0,
      'esopPool': 10.0,
      'advisorEquity': 2.0,
      'coFounderEq': 0.0,
      'prefMultiple': '1',
      'prefType': 'nonparticipating',
      'latestValuation': 25000000.0,
      'postMoneyValuation': 25000000.0,
      'ezLeads': [],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    await profileRef.set(defaultProfile);

    // Add Sasitharan as default Shareholder (founder)
    await profileRef.collection('shareholders').add({
      'name': 'Sasitharan',
      'role': 'Founder',
      'ownershipPercentage': 88.0,
      'investmentAmount': 0.0,
      'preferenceType': 'common',
    });

    // Add ESOP as default Shareholder
    await profileRef.collection('shareholders').add({
      'name': 'ESOP Pool',
      'role': 'ESOP',
      'ownershipPercentage': 10.0,
      'investmentAmount': 0.0,
      'preferenceType': 'common',
    });

    // Add Advisor as default Shareholder
    await profileRef.collection('shareholders').add({
      'name': 'Advisor Pool',
      'role': 'Advisor',
      'ownershipPercentage': 2.0,
      'investmentAmount': 0.0,
      'preferenceType': 'common',
    });
  }

  // -----------------------------------------------------------------
  // Operations / Mutations
  // -----------------------------------------------------------------
  Future<void> updateProfileField(String field, dynamic value) async {
    if (_currentUser == null) return;
    final profileRef = _db.collection('users').doc(_currentUser!.uid).collection('companyProfiles').doc('primary-startup');
    await profileRef.update({
      field: value,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> updateProfileFields(Map<String, dynamic> fields) async {
    if (_currentUser == null) return;
    final profileRef = _db.collection('users').doc(_currentUser!.uid).collection('companyProfiles').doc('primary-startup');
    await profileRef.update({
      ...fields,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Lead management (Inside ezLeads array)
  Future<void> saveLeads(List<EZLead> leads) async {
    if (_currentUser == null) return;
    final profileRef = _db.collection('users').doc(_currentUser!.uid).collection('companyProfiles').doc('primary-startup');
    await profileRef.update({
      'ezLeads': leads.map((l) => l.toMap()).toList(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Shareholders subcollection
  Future<void> addShareholder(Shareholder sh) async {
    if (_currentUser == null) return;
    final shRef = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('shareholders');
    await shRef.add(sh.toMap());
  }

  Future<void> updateShareholder(String id, Map<String, dynamic> data) async {
    if (_currentUser == null) return;
    final shDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('shareholders')
        .doc(id);
    await shDoc.update(data);
  }

  Future<void> deleteShareholder(String id) async {
    if (_currentUser == null) return;
    final shDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('shareholders')
        .doc(id);
    await shDoc.delete();
  }

  // Funding Rounds subcollection
  Future<void> addFundingRound(Map<String, dynamic> data) async {
    if (_currentUser == null) return;
    final roundRef = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('fundingRounds');
    await roundRef.add({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteFundingRound(String id) async {
    if (_currentUser == null) return;
    final roundDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('fundingRounds')
        .doc(id);
    await roundDoc.delete();
  }

  // Tasks subcollection
  Future<void> addTask(CompanyTask task) async {
    if (_currentUser == null) return;
    final taskRef = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('tasks');
    await taskRef.add({
      ...task.toMap(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> updateTask(String id, Map<String, dynamic> data) async {
    if (_currentUser == null) return;
    final taskDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('tasks')
        .doc(id);
    await taskDoc.update({
      ...data,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteTask(String id) async {
    if (_currentUser == null) return;
    final taskDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('tasks')
        .doc(id);
    await taskDoc.delete();
  }

  // Chat Messages subcollection
  Future<void> sendChatMessage(String text, {String? mediaName, String? mediaType, int? mediaSize, String? mediaUrl}) async {
    if (_currentUser == null) return;
    final chatRef = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('teamChats');

    final payload = {
      'senderUid': _currentUser!.uid,
      'senderName': _currentUser!.displayName ?? _currentUser!.email?.split('@')[0] ?? 'User',
      'senderEmail': _currentUser!.email ?? '',
      'text': text,
      'isEncrypted': true,
      'createdAt': FieldValue.serverTimestamp(),
      'readBy': [_currentUser!.uid],
      if (mediaName != null) 'mediaName': mediaName,
      if (mediaType != null) 'mediaType': mediaType,
      if (mediaSize != null) 'mediaSize': mediaSize,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
    };

    await chatRef.add(payload);
  }

  Future<void> deleteChatMessage(String id) async {
    if (_currentUser == null) return;
    final chatDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('teamChats')
        .doc(id);
    await chatDoc.delete();
  }

  Future<void> updateChatMessage(String id, String newText) async {
    if (_currentUser == null) return;
    final chatDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('teamChats')
        .doc(id);
    await chatDoc.update({'text': newText});
  }

  void _markMessagesAsRead(CollectionReference chatCollRef) {
    if (_currentUser == null) return;
    for (var msg in _messages) {
      if (msg.senderUid != _currentUser!.uid && !msg.readBy.contains(_currentUser!.uid)) {
        chatCollRef.doc(msg.id).update({
          'readBy': FieldValue.arrayUnion([_currentUser!.uid])
        });
      }
    }
  }

  // -----------------------------------------------------------------
  // Presence & Typing State
  // -----------------------------------------------------------------
  Future<void> _updatePresence({required String status, required bool isTyping}) async {
    if (_currentUser == null) return;
    final presenceDoc = _db
        .collection('users')
        .doc(_currentUser!.uid)
        .collection('companyProfiles')
        .doc('primary-startup')
        .collection('presence')
        .doc(_currentUser!.uid);

    await presenceDoc.set({
      'uid': _currentUser!.uid,
      'name': _currentUser!.displayName ?? _currentUser!.email?.split('@')[0] ?? 'User',
      'email': _currentUser!.email ?? '',
      'lastActive': FieldValue.serverTimestamp(),
      'isTyping': isTyping,
      'status': status,
    }, SetOptions(merge: true));
  }

  Future<void> setTypingState(bool isTyping) async {
    await _updatePresence(status: 'online', isTyping: isTyping);
  }

  // Helpers
  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void _setError(String msg) {
    _errorMessage = msg;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
