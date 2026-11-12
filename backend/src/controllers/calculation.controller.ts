import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PythonEngineClient } from '../services/python-engine.service.js';
import { DashboardConfigRepository } from '../repositories/dashboard-tab.repository.js';
import crypto from 'crypto';

export class CalculationController {
  static async validate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { formula, columns } = req.body;

      if (!formula || typeof formula !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Formula string is required.'
        });
        return;
      }

      if (!columns || !Array.isArray(columns)) {
        res.status(400).json({
          success: false,
          message: 'Columns list is required.'
        });
        return;
      }

      const result = await PythonEngineClient.validateFormula(formula, columns);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error('[CalculationController.validate Error]:', err.message);
      res.status(400).json({
        success: false,
        message: err.message || 'Formula validation failed.'
      });
    }
  }

  static async pivot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { rows, columns, rowFields, columnField, valueFormula, aggregation, valueLabel } = req.body;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ success: false, message: 'Rows array is required and cannot be empty.' });
        return;
      }
      if (!Array.isArray(rowFields) || rowFields.length === 0) {
        res.status(400).json({ success: false, message: 'At least one Rows field is required.' });
        return;
      }
      if (!valueFormula || typeof valueFormula !== 'string') {
        res.status(400).json({ success: false, message: 'Value formula is required.' });
        return;
      }

      const result = await PythonEngineClient.pivotTable({
        rows,
        columns: columns || Object.keys(rows[0] || {}),
        row_fields: rowFields,
        column_field: columnField || null,
        value_formula: valueFormula,
        aggregation: aggregation || 'sum',
        value_label: valueLabel || null
      });

      res.status(200).json({ success: result.success, data: result });
    } catch (err: any) {
      console.error('[CalculationController.pivot Error]:', err.message);
      res.status(400).json({ success: false, message: err.message || 'Pivot calculation failed.' });
    }
  }

  static async evaluate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { rows, columns, formula, targetColumn, saveDefinition, projectId } = req.body;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Rows array is required and cannot be empty.'
        });
        return;
      }

      if (!targetColumn || typeof targetColumn !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Target column name is required.'
        });
        return;
      }

      const result = await PythonEngineClient.evaluateCalculation(
        rows,
        columns || Object.keys(rows[0] || {}),
        formula,
        targetColumn.trim()
      );

      // If user requested to save the calculation definition to their project
      if (saveDefinition && req.user && result.success) {
        await DashboardConfigRepository.addCalculation(
          req.user.userId,
          projectId || 'default',
          {
            id: `calc_${crypto.randomUUID()}`,
            name: targetColumn.trim(),
            formula,
            targetColumn: targetColumn.trim()
          }
        );
      }

      res.status(200).json({
        success: result.success,
        data: result
      });
    } catch (err: any) {
      console.error('[CalculationController.evaluate Error]:', err.message);
      res.status(400).json({
        success: false,
        message: err.message || 'Calculation evaluation failed.'
      });
    }
  }
}
