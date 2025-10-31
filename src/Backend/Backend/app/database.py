from dotenv import load_dotenv
import os
import pyodbc

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

# Connection string for SQL Server
database = (
    f"Driver={{ODBC Driver 17 for SQL Server}};"
    f"Server={os.getenv('DB_SERVER')};"
    f"Database={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_USER')};"
    f"PWD={os.getenv('DB_PASSWORD')}"
)

# --------------------------------------------------
# Core Connection Helper
# --------------------------------------------------
def get_connection():
    """Returns a live pyodbc connection."""
    return pyodbc.connect(database)


def get_cursor():
    """Returns (connection, cursor) pair — original version kept for compatibility."""
    conn = get_connection()
    return conn, conn.cursor()

# --------------------------------------------------
#Universal DB helpers — required by export_service/fetch_forms
# --------------------------------------------------
def fetch_all(sql, params=()):
    """
    Executes a SELECT query and returns list of dicts.
    Example: rows = fetch_all("SELECT * FROM patients WHERE id=?", (5,))
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        columns = [column[0] for column in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        return results
    finally:
        cur.close()
        conn.close()


def execute_query(sql, params=(), commit=False):
    """
    Executes any SQL command.
    - SELECT → returns list of dicts
    - INSERT/UPDATE/DELETE → commits if commit=True
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)

        if commit:
            conn.commit()
            return cur.rowcount  # number of affected rows

        # For SELECT queries
        if cur.description:
            columns = [column[0] for column in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]

        return None
    finally:
        cur.close()
        conn.close()
