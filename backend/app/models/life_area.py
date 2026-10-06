from sqlalchemy import String, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.base import PK_TYPE


class LifeArea(Base):
    __tablename__ = "life_areas"

    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(100), nullable=True)
    color_hex: Mapped[str] = mapped_column(String(7), nullable=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
