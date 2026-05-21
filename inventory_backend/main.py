from fastapi import FastAPI, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

# --- 新しく追加したデータベース用のライブラリ ---
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base

# 1. データベースの設定 (SQLite x SQLAlchemy)
# データベースの保存先ファイル名を指定します（このファイルが自動的に作成されます）
SQLALCHEMY_DATABASE_URL = "sqlite:///./inventory.db"

# データベースと通信するための「エンジン」を作成します
# check_same_thread=False は SQLite を FastAPI で使う場合のおまじないです
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# データベースとの「セッション（接続状態）」を作るための工場（ファクトリ）を定義します
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# データベースの「テーブル（表）」の設計図を作るための土台です
Base = declarative_base()

# 2. データベースのテーブル定義 (SQLAlchemyモデル)
# データベース内にどのような列(カラム)を作るかを定義します
class DBInventoryItem(Base):
    __tablename__ = "inventory" # テーブルの名前

    # primary_key=True で、このIDが被らない一意のナンバリングであることを示します
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, index=True)
    company_name = Column(String)
    quantity = Column(Integer)
    location = Column(String)
    # default=datetime.now で、データ作成時に自動で現在時刻が入るようにします
    last_updated = Column(DateTime, default=datetime.now)

# ここで実際にデータベースファイル（inventory.db）とテーブルを作成します
Base.metadata.create_all(bind=engine)



# 3. Pydanticモデル (APIのデータの型定義)
# フロントエンドから受け取る用のデータ型（IDや更新日時はフロントからは送られてこない）
class InventoryCreate(BaseModel):
    product_name: str = Field(..., example="段ボール箱 A型")
    company_name: str = Field(..., example="株式会社ロジスティクス")
    quantity: int = Field(..., ge=0, example=150)
    location: str = Field(..., example="A倉庫 1列-2段")

# フロントエンドへ返す用のデータ型（IDや更新日時が含まれる）
class InventoryResponse(InventoryCreate):
    id: int
    last_updated: datetime

    # ORM(今回はSQLAlchemy)のデータをPydanticで読み込めるようにする設定
    class Config:
        from_attributes = True


# 4. FastAPI アプリケーションのセットアップ
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 各APIが呼ばれるたびにデータベースのセッションを開き、終わったら閉じるための関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 5. APIエンドポイント

# 在庫一覧を取得するAPI
@app.get("/api/inventory", response_model=List[InventoryResponse])
def get_inventory(db: Session = Depends(get_db)):
    """データベースからすべての在庫リストを取得して返します"""
    # SELECT * FROM inventory; と同じ処理です
    items = db.query(DBInventoryItem).all()
    return items

# 新しい在庫データを追加するAPI
@app.post("/api/inventory", response_model=InventoryResponse)
def add_inventory(item: InventoryCreate, db: Session = Depends(get_db)):
    """フロントエンドからのデータをデータベースに保存します"""
    
    # 受け取ったデータ(item)をデータベース用のモデル(DBInventoryItem)に変換します
    db_item = DBInventoryItem(
        product_name=item.product_name,
        company_name=item.company_name,
        quantity=item.quantity,
        location=item.location
        # idとlast_updatedはデータベース側で自動生成されます
    )
    
    # データベースに追加(INSERT)して、変更を確定(COMMIT)します
    db.add(db_item)
    db.commit()
    
    # 自動生成されたIDなどを反映させるために最新状態を再取得します
    db.refresh(db_item)
    
    return db_item
# --- 1. 在庫数を更新するAPI (PUTリクエスト) ---
@app.put("/api/inventory/{item_id}", response_model=InventoryResponse)
def update_inventory(item_id: int, item_update: InventoryCreate, db: Session = Depends(get_db)):
    """指定したIDの在庫情報を更新します"""
    
    # IDを基にデータベースから対象のアイテムを検索します
    db_item = db.query(DBInventoryItem).filter(DBInventoryItem.id == item_id).first()
    
    # アイテムが見つからない場合はエラーを返します
    if db_item is None:
        raise HTTPException(status_code=404, detail="アイテムが見つかりません")
    
    # 新しいデータで上書きします
    db_item.product_name = item_update.product_name
    db_item.company_name = item_update.company_name
    db_item.quantity = item_update.quantity
    db_item.location = item_update.location
    db_item.last_updated = datetime.now() # 更新日時を現在時刻に更新
    
    # 変更を保存します
    db.commit()
    db.refresh(db_item)
    return db_item

# --- 2. アイテムを削除するAPI (DELETEリクエスト) ---
@app.delete("/api/inventory/{item_id}")
def delete_inventory(item_id: int, db: Session = Depends(get_db)):
    """指定したIDのアイテムを削除します"""
    
    # 対象のアイテムを検索します
    db_item = db.query(DBInventoryItem).filter(DBInventoryItem.id == item_id).first()
    
    # 見つからない場合
    if db_item is None:
        raise HTTPException(status_code=404, detail="アイテムが見つかりません")
    
    # 削除処理を実行します
    db.delete(db_item)
    db.commit()
    
    return {"message": "削除が完了しました"}