import UIKit
import Capacitor
import AuthenticationServices

class HealthChainBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthChainAppleSignIn())
    }
}

@objc(HealthChainAppleSignIn)
class HealthChainAppleSignIn: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    let identifier = "HealthChainAppleSignIn"
    let jsName = "HealthChainAppleSignIn"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCredentialState", returnType: CAPPluginReturnPromise)
    ]
    private var pendingCall: CAPPluginCall?
    private var pendingState: String?
    private var authorizationController: ASAuthorizationController?
    private var authorizationAnchor: UIWindow?
    private var revocationObserver: NSObjectProtocol?

    override func load() {
        revocationObserver = NotificationCenter.default.addObserver(
            forName: ASAuthorizationAppleIDProvider.credentialRevokedNotification,
            object: nil, queue: .main
        ) { [weak self] _ in self?.notifyListeners("credentialRevoked", data: [:]) }
    }

    deinit {
        if let observer = revocationObserver { NotificationCenter.default.removeObserver(observer) }
    }

    @objc func getCredentialState(_ call: CAPPluginCall) {
        guard let user = call.getString("userIdentifier"), !user.isEmpty, user.count <= 256 else {
            call.reject("Apple identity unavailable.", "UNAVAILABLE")
            return
        }
        ASAuthorizationAppleIDProvider().getCredentialState(forUserID: user) { state, error in
            if error != nil { call.reject("Apple credential check unavailable.", "UNAVAILABLE"); return }
            let value: String
            switch state {
            case .authorized: value = "authorized"
            case .revoked: value = "revoked"
            case .notFound: value = "notFound"
            case .transferred: value = "transferred"
            @unknown default: value = "unknown"
            }
            call.resolve(["state": value])
        }
    }

    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingCall == nil,
                  let nonce = call.getString("nonce"), nonce.count == 64,
                  let state = call.getString("state"), state.count == 64,
                  let anchor = self.bridge?.viewController?.view.window else {
                call.reject("Apple sign-in is unavailable.", "UNAVAILABLE")
                return
            }
            self.pendingCall = call
            self.pendingState = state
            self.authorizationAnchor = anchor
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email, .fullName]
            request.nonce = nonce
            request.state = state
            let controller = ASAuthorizationController(authorizationRequests: [request])
            self.authorizationController = controller
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return authorizationAnchor ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { pendingCall = nil; pendingState = nil; authorizationController = nil; authorizationAnchor = nil }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              credential.state == pendingState,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            pendingCall?.reject("Apple sign-in could not be verified.", "VERIFICATION_FAILED")
            return
        }
        var result: [String: Any] = ["identityToken": token, "state": credential.state ?? ""]
        if let name = credential.fullName {
            result["fullName"] = PersonNameComponentsFormatter().string(from: name)
        }
        if let codeData = credential.authorizationCode,
           let code = String(data: codeData, encoding: .utf8) {
            result["authorizationCode"] = code
            result["appleUser"] = credential.user
        }
        pendingCall?.resolve(result)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let cancelled = (error as? ASAuthorizationError)?.code == .canceled
        pendingCall?.reject(cancelled ? "Sign-in cancelled." : "Apple sign-in failed.", cancelled ? "CANCELLED" : "AUTH_FAILED")
        pendingCall = nil; pendingState = nil; authorizationController = nil; authorizationAnchor = nil
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        excludeHealthStorageFromBackup()
        return true
    }

    private func excludeHealthStorageFromBackup() {
        // Preferences and WKWebView records live under Library. Exclude Documents
        // as well so future local record files do not enter an iCloud/device backup.
        for directory in [FileManager.SearchPathDirectory.libraryDirectory, .documentDirectory] {
            do {
                var url = try FileManager.default.url(for: directory, in: .userDomainMask,
                                                     appropriateFor: nil, create: true)
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                try url.setResourceValues(values)
            } catch {
                NSLog("HealthChain: local backup exclusion requires attention.")
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        excludeHealthStorageFromBackup()
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
