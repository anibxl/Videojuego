import UIKit
import Capacitor

/// Écran principal de Hoop Bounce sur iPhone et iPad : la vue Capacitor (WebView), réglée pour un jeu.
///  - plein écran : barre d'état masquée, barre d'accueil (home indicator) estompée ;
///  - les gestes du système sur les bords (retour à l'accueil, centre de contrôle) demandent un second
///    glissement : on ne quitte pas le jeu par erreur en jouant avec les pouces près des bords ;
///  - paysage uniquement ;
///  - la WebView ne défile pas et ne « rebondit » pas : les marges de l'encoche et de la barre d'accueil
///    sont gérées par le jeu lui-même (CSS env(safe-area-inset-*), viewport-fit=cover).
class MainViewController: CAPBridgeViewController {
    private let background = UIColor(red: 4 / 255, green: 7 / 255, blue: 15 / 255, alpha: 1)

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .landscapeRight }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = background
        guard let web = webView else { return }
        web.isOpaque = false
        web.backgroundColor = background
        web.scrollView.backgroundColor = background
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.scrollView.isScrollEnabled = false
        web.allowsLinkPreview = false
        setNeedsUpdateOfHomeIndicatorAutoHidden()
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
    }
}
