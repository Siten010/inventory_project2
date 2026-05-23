import { useEffect, useState } from "react";
import "./AppSample.css";

const API_BASE_URL = "○○○○○○○";

function AppSample() {
  // form でバックエンドに送信するデータ（値を）管理しています。
  const [form, setForm] = useState({
    product_name: "",
    company_name: "",
    quantity: 0,
    location: "",
  });

  // DBから取得したデータを itemsで管理します。
  const [items, setItems] = useState([]);
  // 今は気にしなくてよい。
  const [error, setError] = useState("");
  // 今は気にしなくてよい
  const [loading, setLoading] = useState(false);

  // 入力欄を操作するたびに実行される関数です。入力欄の変更を form（バックエンドに送るデータ）に反映
  const handleChange = (e) => {
    // e.target には、<input type="text"name="product_name"value={form.product_name} placeholder="例：段ボール箱 A型"> といったデータが格納されています。
    // その中のname（name="product_name" や name="company_name" のこと） と value （入力された値）を取得しています。
    const { name, value } = e.target;

    // prev には、formの値が入ります。このような記述方法をアップデート関数と言います。
    setForm((prev) => ({
      // 現在保存されている prev(form) をコピーします。
      ...prev,
      // value（入力された値）の name 属性（name="product_name" や name="company_name" のこと）が quantity だった場合、value を Number 型に変換します。
      // このコードで prev(form) の内容を上書きします。
      [name]: name === "quantity" ? Number(value) : value,
    }));
  };

  // DBから在庫一覧を取得します。ここの処理は今は覚えなくてよい。
  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory`);

      if (!response.ok) {
        throw new Error("在庫一覧の取得に失敗しました");
      }

      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // 画面を開いたときに一覧を取得します。最初のみ実行されます。そうなんだで流してください。
  useEffect(() => {
    fetchInventory();
  }, []);

  // DBに登録する関数です。登録ボタンを押すと実行されます。HTMLの記述方法の関係上、登録ボタンを押したときに実行されているようにコード上では見えないかも...
  const handleSubmit = async (e) => {
    // 下の3つのコードは今は無視で大丈夫です。
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 実際にバックエンドに form（バックエンドに送るデータ）を送信してるんだな～の理解で今は大丈夫です。
      const response = await fetch(`${API_BASE_URL}/api/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("在庫の登録に失敗しました");
      }

      // 登録後に入力欄をリセット
      setForm({
        product_name: "",
        company_name: "",
        quantity: 0,
        location: "",
      });

      // 登録後に一覧を再取得
      await fetchInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 数量を1増やす関数です。「+1」ボタンを押すと実行されます。
  const incrementQuantity = () => {
    setForm((prev) => ({
      ...prev,
      quantity: prev.quantity + 1,
    }));
  };

  return (
    // className="○○○○" と記述されているところは全無視で問題ないです。
    <div className="app-container">
      <div className="form-card">
        <h2 className="form-title">在庫登録</h2>

        {error && <p className="error-message">{error}</p>}

        {/* 登録ボタンが押されたときに、handleSubmit を実行することを宣言しています。 */}
        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <label>商品名</label>
            <input
              // テキスト入力を行う入力欄に設定しています。
              type="text"
              // name 属性に名前を付けています。
              name="product_name"
              // 入力された値を value に格納します。value は入力されている文字を表示するために使用する変数です。
              value={form.product_name}
              // onChange は1文字増減されるたびに実行されます（そーゆ仕様に元からなっている。）。
              // onChange は handleChange を呼び出します。
              onChange={handleChange}
              // 入力前に表示されているグレーの文字を設定しています。
              placeholder="例：段ボール箱 A型"
              // 必須入力に設定しています。
              required
            />
          </section>

          <section className="form-section">
            <label>会社名</label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="例：株式会社ロジスティクス"
              required
            />
          </section>

          <section className="form-section">
            <label>在庫数</label>
            <div className="quantity-row">
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                required
              />
              <button
                // button であることを設定しています。
                type="button"
                className="count-button"
                // onClick はクリックされるたびに実行されます。incrementQuantity を呼び出します。
                onClick={incrementQuantity}
              >
                +1
              </button>
            </div>
          </section>

          <section className="form-section">
            <label>地域名・保管場所</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="例：A倉庫 1列-2段"
              required
            />
          </section>

          {/* ここから下3行は、今は無視で良い */}
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "登録中..." : "登録する"}
          </button>
        </form>
      </div>

      <div className="list-card">
        <h2 className="form-title">在庫一覧</h2>

        {/* ここから下は、items(データベースに保存されたデータ)が0の場合は、「まだ在庫が登録されていません。」と表示されます。
データがある場合は、データの数だけデータを表示するという処理を行っています。 */}
        {items.length === 0 ? (
          <p className="empty-message">まだ在庫が登録されていません。</p>
        ) : (
          <ul className="inventory-list">
            {items.map((item) => (
              <li key={item.id} className="inventory-item">
                <div>
                  <strong>{item.product_name}</strong>
                  <p>{item.company_name}</p>
                  <p>{item.location}</p>
                </div>
                <span className="quantity-badge">{item.quantity}個</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AppSample;
