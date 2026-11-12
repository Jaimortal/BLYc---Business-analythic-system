import ast
import re
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np

class FormulaSecurityError(Exception):
    """Raised when an illegal or unsafe syntax node is detected in a formula."""
    pass

class SafeFormulaParser:
    """
    Strictly safe AST-based formula parser and evaluator for business calculations.
    
    Guarantees:
    - Zero use of eval() or exec()
    - Strict node whitelisting: only binary ops, unary ops, constants, and approved columns
    - Handles Excel-style bracketed column references: [Unit Price] * [Quantity Sold]
    - Safe division by zero handling (returns 0.0 instead of crashing or generating Inf)
    - Comprehensive error messages for non-technical users
    """

    ALLOWED_NODES = {
        ast.Expression,
        ast.BinOp,
        ast.UnaryOp,
        ast.Constant,
        ast.Name,
        ast.Load,
        ast.Add,
        ast.Sub,
        ast.Mult,
        ast.Div,
        ast.FloorDiv,
        ast.Mod,
        ast.Pow,
        ast.UAdd,
        ast.USub
    }

    def __init__(self, available_columns: List[str]):
        self.available_columns = available_columns
        self.col_to_alias: Dict[str, str] = {}
        self.alias_to_col: Dict[str, str] = {}

    def _normalize_formula(self, formula: str) -> Tuple[str, List[str]]:
        """
        Preprocess formula to extract bracketed and raw column references,
        mapping them to safe AST identifier aliases (__COL_0__, __COL_1__, etc.).
        """
        if not formula or not formula.strip():
            raise ValueError("Formula cannot be empty.")

        # Reset alias mappings per formula normalization
        self.col_to_alias = {}
        self.alias_to_col = {}

        cleaned = formula.strip()

        # Replace Excel power operator ^ with Python **
        cleaned = re.sub(r'\^', '**', cleaned)

        referenced_cols: List[str] = []
        col_index = 0

        # 1. First extract bracketed column references: [Column Name]
        def replace_bracket(match: re.Match) -> str:
            nonlocal col_index
            col_name = match.group(1).strip()
            
            # Case-insensitive column matching
            matched = None
            for avail in self.available_columns:
                if avail.lower() == col_name.lower():
                    matched = avail
                    break
            
            if not matched:
                raise ValueError(f"Column '[{col_name}]' not found in dataset. Available columns: {', '.join(self.available_columns)}")

            if matched not in self.col_to_alias:
                alias = f"__COL_{col_index}__"
                col_index += 1
                self.col_to_alias[matched] = alias
                self.alias_to_col[alias] = matched
            else:
                alias = self.col_to_alias[matched]

            if matched not in referenced_cols:
                referenced_cols.append(matched)
            return alias

        cleaned = re.sub(r'\[([^\]]+)\]', replace_bracket, cleaned)

        # 2. Check for unbracketed column identifiers
        # Split tokens to find standalone names matching existing columns
        for avail in self.available_columns:
            # Word boundary regex for single identifier matching
            pattern = rf'\b{re.escape(avail)}\b'
            if re.search(pattern, cleaned, flags=re.IGNORECASE):
                if avail not in self.col_to_alias:
                    alias = f"__COL_{col_index}__"
                    col_index += 1
                    self.col_to_alias[avail] = alias
                    self.alias_to_col[alias] = avail
                else:
                    alias = self.col_to_alias[avail]
                
                cleaned = re.sub(pattern, alias, cleaned, flags=re.IGNORECASE)
                if avail not in referenced_cols:
                    referenced_cols.append(avail)

        return cleaned, referenced_cols

    def validate(self, formula: str) -> Tuple[bool, List[str], Optional[str]]:
        """
        Validates the formula against safe AST syntax and column existence.
        Returns: (is_valid, referenced_columns, error_message)
        """
        try:
            normalized_expr, referenced_cols = self._normalize_formula(formula)
            tree = ast.parse(normalized_expr, mode='eval')

            # Verify every node in AST
            for node in ast.walk(tree):
                if type(node) not in self.ALLOWED_NODES:
                    raise FormulaSecurityError(
                        f"Disallowed expression or function call: '{type(node).__name__}'. Only basic arithmetic (+, -, *, /, ^) is supported."
                    )
                
                if isinstance(node, ast.Name):
                    if node.id not in self.alias_to_col:
                        raise ValueError(f"Unknown variable or function: '{node.id}'. Please use valid columns.")

                if isinstance(node, ast.Constant):
                    if not isinstance(node.value, (int, float)):
                        raise ValueError(f"Only numeric constants are allowed, found: {repr(node.value)}")

            return True, referenced_cols, None
        except (ValueError, SyntaxError, FormulaSecurityError) as e:
            return False, [], str(e)
        except Exception as e:
            return False, [], f"Validation failed: {str(e)}"

    def _eval_node(self, node: ast.AST, series_scope: Dict[str, pd.Series]):
        """
        Recursive AST tree-walker evaluator directly operating on Pandas Series / Scalars.
        NEVER executes arbitrary code or strings.
        """
        if isinstance(node, ast.Constant):
            return node.value

        elif isinstance(node, ast.Name):
            if node.id in series_scope:
                return series_scope[node.id]
            raise ValueError(f"Missing column value for token {node.id}")

        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand, series_scope)
            if isinstance(node.op, ast.UAdd):
                return +operand
            elif isinstance(node.op, ast.USub):
                return -operand
            raise FormulaSecurityError(f"Unsupported unary operator: {type(node.op).__name__}")

        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left, series_scope)
            right = self._eval_node(node.right, series_scope)

            if isinstance(node.op, ast.Add):
                return left + right
            elif isinstance(node.op, ast.Sub):
                return left - right
            elif isinstance(node.op, ast.Mult):
                return left * right
            elif isinstance(node.op, ast.Div):
                # Safe division by zero handling
                with np.errstate(divide='ignore', invalid='ignore'):
                    if isinstance(right, pd.Series):
                        res = left / right
                        return res.replace([np.inf, -np.inf], 0.0).fillna(0.0)
                    else:
                        if right == 0:
                            return 0.0 if isinstance(left, (int, float)) else pd.Series(0.0, index=left.index)
                        return left / right
            elif isinstance(node.op, ast.FloorDiv):
                with np.errstate(divide='ignore', invalid='ignore'):
                    if isinstance(right, pd.Series):
                        res = left // right
                        return res.replace([np.inf, -np.inf], 0).fillna(0)
                    else:
                        if right == 0:
                            return 0 if isinstance(left, (int, float)) else pd.Series(0, index=left.index)
                        return left // right
            elif isinstance(node.op, ast.Mod):
                with np.errstate(divide='ignore', invalid='ignore'):
                    if isinstance(right, pd.Series):
                        res = left % right
                        return res.replace([np.inf, -np.inf], 0).fillna(0)
                    else:
                        return 0 if right == 0 else left % right
            elif isinstance(node.op, ast.Pow):
                return left ** right
            else:
                raise FormulaSecurityError(f"Unsupported binary operator: {type(node.op).__name__}")

        else:
            raise FormulaSecurityError(f"Disallowed AST node: {type(node).__name__}")

    def evaluate(self, df: pd.DataFrame, formula: str, target_column: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Evaluates formula safely across the DataFrame and adds the target_column.
        Returns the updated DataFrame and summary statistics of the new column.
        """
        is_valid, referenced_cols, error = self.validate(formula)
        if not is_valid:
            raise ValueError(error or "Invalid formula syntax.")

        normalized_expr, _ = self._normalize_formula(formula)
        tree = ast.parse(normalized_expr, mode='eval')

        # Build Series scope for mapped aliases
        series_scope: Dict[str, pd.Series] = {}
        for alias, col_name in self.alias_to_col.items():
            if col_name in df.columns:
                # Force convert column to numeric, filling NaN with 0.0
                series_scope[alias] = pd.to_numeric(df[col_name], errors='coerce').fillna(0.0)
            else:
                raise ValueError(f"Column '{col_name}' does not exist in dataset.")

        # Execute safe AST tree evaluation
        result_series = self._eval_node(tree.body, series_scope)

        if isinstance(result_series, (int, float)):
            # Broadcast constant to full dataframe length
            result_series = pd.Series([result_series] * len(df), index=df.index)

        # Round result to 2 decimals if floating point
        clean_result = result_series.replace([np.inf, -np.inf], 0.0).fillna(0.0).round(4)
        
        updated_df = df.copy()
        updated_df[target_column] = clean_result

        # Calculate summary statistics
        numeric_vals = clean_result.astype(float)
        summary = {
            "sum": float(numeric_vals.sum()) if len(numeric_vals) > 0 else 0.0,
            "mean": float(numeric_vals.mean()) if len(numeric_vals) > 0 else 0.0,
            "min": float(numeric_vals.min()) if len(numeric_vals) > 0 else 0.0,
            "max": float(numeric_vals.max()) if len(numeric_vals) > 0 else 0.0,
            "count": int(len(numeric_vals))
        }

        return updated_df, summary
