"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var auth_service_js_1 = require("../src/services/auth.service.js");
var hash_js_1 = require("../src/security/hash.js");
var token_js_1 = require("../src/security/token.js");
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var rawPassword, hash, isMatch, isWrongMatch, token, verified, forgedToken, user1, duplicateBlocked, err_1, loginSuccess, invalidLoginBlocked, _a, user2, profileUser1, profileUser2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('--- Starting BLYc Phase 2 Authentication & Security Tests ---');
                    // Test 1: Argon2id Password Hashing
                    console.log('\n[Test 1] Testing Argon2id password hashing and verification...');
                    rawPassword = 'Password123!';
                    return [4 /*yield*/, (0, hash_js_1.hashPassword)(rawPassword)];
                case 1:
                    hash = _b.sent();
                    if (!hash.startsWith('$argon2id$')) {
                        throw new Error('Hash algorithm is not Argon2id.');
                    }
                    return [4 /*yield*/, (0, hash_js_1.verifyPassword)(rawPassword, hash)];
                case 2:
                    isMatch = _b.sent();
                    return [4 /*yield*/, (0, hash_js_1.verifyPassword)('WrongPassword123!', hash)];
                case 3:
                    isWrongMatch = _b.sent();
                    if (!isMatch || isWrongMatch) {
                        throw new Error('Argon2id password verification failed.');
                    }
                    console.log('✅ Argon2id password hashing verified.');
                    // Test 2: JWT Generation & Verification
                    console.log('\n[Test 2] Testing JWT session token generation and verification...');
                    token = (0, token_js_1.generateToken)({
                        userId: 'test-user-123',
                        email: 'founder@blyc.test',
                        role: 'user'
                    });
                    verified = (0, token_js_1.verifyToken)(token);
                    if (!verified || verified.userId !== 'test-user-123' || verified.email !== 'founder@blyc.test') {
                        throw new Error('JWT token verification failed or payload mismatch.');
                    }
                    forgedToken = token.slice(0, -6) + 'abc123';
                    if ((0, token_js_1.verifyToken)(forgedToken) !== null) {
                        throw new Error('Forged JWT token was improperly accepted.');
                    }
                    console.log('✅ JWT session token security verified.');
                    // Test 3: User Registration & Duplicate Email Protection
                    console.log('\n[Test 3] Testing user registration and duplicate prevention...');
                    return [4 /*yield*/, auth_service_js_1.AuthService.register({
                            email: 'founder1@startup.io',
                            password: 'SecurePassword123!'
                        })];
                case 4:
                    user1 = _b.sent();
                    if (!user1.user || user1.user.email !== 'founder1@startup.io') {
                        throw new Error('User registration failed.');
                    }
                    duplicateBlocked = false;
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, auth_service_js_1.AuthService.register({
                            email: 'founder1@startup.io',
                            password: 'AnotherPassword123!'
                        })];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    err_1 = _b.sent();
                    duplicateBlocked = true;
                    return [3 /*break*/, 8];
                case 8:
                    if (!duplicateBlocked) {
                        throw new Error('Duplicate email registration was not blocked.');
                    }
                    console.log('✅ User registration and unique email guard verified.');
                    // Test 4: User Authentication / Login
                    console.log('\n[Test 4] Testing user login with valid and invalid credentials...');
                    return [4 /*yield*/, auth_service_js_1.AuthService.login({
                            email: 'founder1@startup.io',
                            password: 'SecurePassword123!'
                        })];
                case 9:
                    loginSuccess = _b.sent();
                    if (!loginSuccess.token || loginSuccess.user.email !== 'founder1@startup.io') {
                        throw new Error('Valid login failed.');
                    }
                    invalidLoginBlocked = false;
                    _b.label = 10;
                case 10:
                    _b.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, auth_service_js_1.AuthService.login({
                            email: 'founder1@startup.io',
                            password: 'IncorrectPassword999!'
                        })];
                case 11:
                    _b.sent();
                    return [3 /*break*/, 13];
                case 12:
                    _a = _b.sent();
                    invalidLoginBlocked = true;
                    return [3 /*break*/, 13];
                case 13:
                    if (!invalidLoginBlocked) {
                        throw new Error('Invalid password was improperly accepted.');
                    }
                    console.log('✅ User login authentication verified.');
                    // Test 5: Multi-Tenant & User Isolation
                    console.log('\n[Test 5] Testing multi-user tenant data isolation...');
                    return [4 /*yield*/, auth_service_js_1.AuthService.register({
                            email: 'founder2@anotherbusiness.com',
                            password: 'PasswordB456!'
                        })];
                case 14:
                    user2 = _b.sent();
                    return [4 /*yield*/, auth_service_js_1.AuthService.getCurrentUser(user1.user.id)];
                case 15:
                    profileUser1 = _b.sent();
                    return [4 /*yield*/, auth_service_js_1.AuthService.getCurrentUser(user2.user.id)];
                case 16:
                    profileUser2 = _b.sent();
                    if (profileUser1.id === profileUser2.id || profileUser1.email === profileUser2.email) {
                        throw new Error('Multi-user tenant collision detected.');
                    }
                    console.log('✅ Multi-user identity and data isolation verified.');
                    console.log('\n🎉 ALL PHASE 2 BACKEND & AUTHENTICATION TESTS PASSED CLEANLY!\n');
                    return [2 /*return*/];
            }
        });
    });
}
runTests().catch(function (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
