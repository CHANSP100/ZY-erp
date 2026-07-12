using System.ComponentModel;

namespace TfMp2Editor;

internal sealed class MainForm : Form
{
    private readonly DbService _svc;
    private readonly ComboBox _cmbMpNo = new() { Width = 180, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _cmbSoNo = new() { Width = 180, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly TextBox _txtFilter = new() { Width = 220 };
    private readonly DataGridView _grid = new();
    private readonly Label _lblStatus = new() { AutoSize = true, Dock = DockStyle.Fill };
    private readonly BindingList<GridRowModel> _rows = new();
    private BindingList<GridRowModel> _viewRows = new();
    private int _sortColumnIndex = -1;
    private SortOrder _sortOrder = SortOrder.None;

    public MainForm(DbService svc, DbConfig cfg)
    {
        _svc = svc;
        Text = $"{AppConstants.AppTitle}  —  {cfg.Server} / {cfg.Database}";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1180, 720);
        Font = new Font("Microsoft YaHei UI", 9F);
        MinimumSize = new Size(900, 500);

        var top = new GroupBox { Text = "查询条件", Dock = DockStyle.Top, Height = 72, Padding = new Padding(8) };
        var topFlow = new FlowLayoutPanel { Dock = DockStyle.Fill, WrapContents = false };
        topFlow.Controls.Add(new Label { Text = "分析单号", AutoSize = true, Padding = new Padding(0, 8, 4, 0) });
        topFlow.Controls.Add(_cmbMpNo);
        topFlow.Controls.Add(new Label { Text = "订单号", AutoSize = true, Padding = new Padding(12, 8, 4, 0) });
        topFlow.Controls.Add(_cmbSoNo);
        var btnQuery = new Button { Text = "查询", Width = 72, Height = 28, Margin = new Padding(16, 4, 4, 4) };
        var btnDelete = new Button { Text = "删除", Width = 72, Height = 28, Margin = new Padding(4) };
        var btnSave = new Button { Text = "保存", Width = 72, Height = 28, Margin = new Padding(4) };
        btnQuery.Click += (_, _) => Query();
        btnDelete.Click += (_, _) => MarkDelete();
        btnSave.Click += (_, _) => Save();
        topFlow.Controls.Add(btnQuery);
        topFlow.Controls.Add(btnDelete);
        topFlow.Controls.Add(btnSave);
        top.Controls.Add(topFlow);

        var hint = new Label
        {
            Text = "说明：仅「选择」列可编辑（对应 PRD_NO_CHG）；选中行点「删除」打删除标记；点「保存」回写勾选并物理删除待删行。",
            Dock = DockStyle.Top,
            Height = 24,
            Padding = new Padding(8, 4, 8, 0),
        };

        var filterBar = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 36, Padding = new Padding(8, 4, 8, 4), WrapContents = false };
        filterBar.Controls.Add(new Label { Text = "快速筛选", AutoSize = true, Padding = new Padding(0, 6, 4, 0) });
        filterBar.Controls.Add(_txtFilter);
        var btnApply = new Button { Text = "应用", Width = 60, Height = 26, Margin = new Padding(6, 2, 0, 0) };
        var btnClear = new Button { Text = "清除", Width = 60, Height = 26, Margin = new Padding(4, 2, 0, 0) };
        btnApply.Click += (_, _) => ApplyFilter();
        btnClear.Click += (_, _) => { _txtFilter.Clear(); ApplyFilter(); };
        filterBar.Controls.Add(btnApply);
        filterBar.Controls.Add(btnClear);
        filterBar.Controls.Add(new Label
        {
            Text = "（匹配任意栏位；点击列标题排序）",
            AutoSize = true,
            Padding = new Padding(8, 6, 0, 0),
            ForeColor = Color.Gray,
        });
        _txtFilter.KeyDown += (_, e) => { if (e.KeyCode == Keys.Enter) ApplyFilter(); };

        _grid.Dock = DockStyle.Fill;
        _grid.AllowUserToAddRows = false;
        _grid.AllowUserToDeleteRows = false;
        _grid.ReadOnly = false;
        _grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        _grid.MultiSelect = false;
        _grid.AutoGenerateColumns = false;
        _grid.RowHeadersVisible = false;
        _grid.BackgroundColor = Color.White;
        _grid.BorderStyle = BorderStyle.Fixed3D;
        _grid.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
        _grid.CellValueChanged += Grid_CellValueChanged;
        _grid.ColumnHeaderMouseClick += Grid_ColumnHeaderMouseClick;
        _grid.CurrentCellDirtyStateChanged += (_, _) =>
        {
            if (_grid.IsCurrentCellDirty)
                _grid.CommitEdit(DataGridViewDataErrorContexts.Commit);
        };

        var statusBar = new Panel { Dock = DockStyle.Bottom, Height = 28, Padding = new Padding(8, 4, 8, 4) };
        statusBar.Controls.Add(_lblStatus);

        Controls.Add(_grid);
        Controls.Add(filterBar);
        Controls.Add(hint);
        Controls.Add(top);
        Controls.Add(statusBar);

        BuildColumns();
        ReloadDropdowns();
        Query();
    }

    private void BuildColumns()
    {
        _grid.Columns.Clear();
        var chkCol = new DataGridViewCheckBoxColumn
        {
            Name = AppConstants.ChkColumnName,
            HeaderText = "选择",
            DataPropertyName = nameof(GridRowModel.Checked),
            Width = 56,
            ReadOnly = false,
            SortMode = DataGridViewColumnSortMode.Programmatic,
        };
        _grid.Columns.Add(chkCol);

        foreach (var col in _svc.Meta.Columns)
        {
            if (col.Equals(_svc.Meta.ChkColumn, StringComparison.OrdinalIgnoreCase))
                continue;
            _grid.Columns.Add(new DataGridViewTextBoxColumn
            {
                Name = col,
                HeaderText = col,
                ReadOnly = true,
                SortMode = DataGridViewColumnSortMode.Programmatic,
                MinimumWidth = 80,
                AutoSizeMode = DataGridViewAutoSizeColumnMode.DisplayedCells,
            });
        }

        _grid.DataSource = _viewRows;
        _grid.CellFormatting += Grid_CellFormatting;
    }

    private void Grid_CellFormatting(object? sender, DataGridViewCellFormattingEventArgs e)
    {
        if (e.RowIndex < 0 || e.ColumnIndex < 0) return;
        if (_grid.Columns[e.ColumnIndex].Name == AppConstants.ChkColumnName) return;
        if (e.RowIndex >= _viewRows.Count) return;

        var row = _viewRows[e.RowIndex];
        var colName = _grid.Columns[e.ColumnIndex].Name;
        e.Value = row.DisplayValue(colName);
        e.FormattingApplied = true;

        if (row.DeleteMark)
            _grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.MistyRose;
        else if (row.CheckboxDirty)
            _grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.LemonChiffon;
        else
            _grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.White;
    }

    private void Grid_ColumnHeaderMouseClick(object? sender, DataGridViewCellMouseEventArgs e)
    {
        if (e.ColumnIndex < 0) return;
        var col = _grid.Columns[e.ColumnIndex];
        if (_sortColumnIndex == e.ColumnIndex)
            _sortOrder = _sortOrder == SortOrder.Ascending ? SortOrder.Descending : SortOrder.Ascending;
        else
        {
            _sortColumnIndex = e.ColumnIndex;
            _sortOrder = SortOrder.Ascending;
        }

        IEnumerable<GridRowModel> sorted = _sortOrder == SortOrder.Descending
            ? _viewRows.OrderByDescending(r => SortKey(r, col.Name))
            : _viewRows.OrderBy(r => SortKey(r, col.Name));

        var list = new BindingList<GridRowModel>(sorted.ToList());
        _viewRows = list;
        _grid.DataSource = _viewRows;
        col.HeaderCell.SortGlyphDirection = _sortOrder;
    }

    private object? SortKey(GridRowModel row, string colName)
    {
        if (colName == AppConstants.ChkColumnName)
            return row.Checked;
        return row.DisplayValue(colName);
    }

    private void Grid_CellValueChanged(object? sender, DataGridViewCellEventArgs e)
    {
        if (e.RowIndex < 0 || e.ColumnIndex < 0) return;
        if (_grid.Columns[e.ColumnIndex].Name != AppConstants.ChkColumnName) return;
        if (e.RowIndex >= _viewRows.Count) return;

        var row = _viewRows[e.RowIndex];
        if (row.DeleteMark)
        {
            row.Checked = row.OrigChecked;
            _grid.InvalidateRow(e.RowIndex);
            return;
        }
        _grid.InvalidateRow(e.RowIndex);
    }

    private void ReloadDropdowns()
    {
        try
        {
            var mp = new List<string> { "" };
            mp.AddRange(_svc.FetchDistinctMpNos());
            var so = new List<string> { "" };
            so.AddRange(_svc.FetchDistinctSoNos());
            _cmbMpNo.DataSource = mp.ToArray();
            _cmbSoNo.DataSource = so.ToArray();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"加载下拉数据失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void Query()
    {
        try
        {
            var mp = _cmbMpNo.SelectedItem?.ToString();
            var so = _cmbSoNo.SelectedItem?.ToString();
            _rows.Clear();
            foreach (var r in _svc.QueryRows(string.IsNullOrWhiteSpace(mp) ? null : mp, string.IsNullOrWhiteSpace(so) ? null : so))
                _rows.Add(r);
            ApplyFilter();
            _lblStatus.Text = $"共 {_rows.Count} 行";
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "查询失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void ApplyFilter()
    {
        var kw = _txtFilter.Text.Trim();
        var list = new BindingList<GridRowModel>();
        foreach (var row in _rows)
        {
            if (string.IsNullOrEmpty(kw))
            {
                list.Add(row);
                continue;
            }
            var text = string.Join(" ", _svc.Meta.Columns.Select(c =>
                c.Equals(_svc.Meta.ChkColumn, StringComparison.OrdinalIgnoreCase)
                    ? (row.Checked ? "1" : "0")
                    : row.DisplayValue(c)));
            if (text.Contains(kw, StringComparison.OrdinalIgnoreCase))
                list.Add(row);
        }
        _viewRows = list;
        _grid.DataSource = _viewRows;
        _lblStatus.Text = $"显示 {_viewRows.Count} / 共 {_rows.Count} 行";
    }

    private GridRowModel? SelectedRow()
    {
        if (_grid.CurrentRow is null || _grid.CurrentRow.Index < 0 || _grid.CurrentRow.Index >= _viewRows.Count)
            return null;
        return _viewRows[_grid.CurrentRow.Index];
    }

    private void MarkDelete()
    {
        var row = SelectedRow();
        if (row is null)
        {
            MessageBox.Show(this, "请先选中要删除的行", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        row.DeleteMark = true;
        if (_grid.CurrentRow is not null)
            _grid.InvalidateRow(_grid.CurrentRow.Index);
    }

    private void Save()
    {
        var toUpdate = _rows.Where(r => r.CheckboxDirty && !r.DeleteMark).ToList();
        var toDelete = _rows.Where(r => r.DeleteMark).Select(r => (r.MpNo, r.Itm)).ToList();

        if (toUpdate.Count == 0 && toDelete.Count == 0)
        {
            MessageBox.Show(this, "没有待保存的变更", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var lines = new List<string>();
        if (toUpdate.Count > 0) lines.Add($"更新 PRD_NO_CHG：{toUpdate.Count} 行");
        if (toDelete.Count > 0) lines.Add($"删除 TF_MP2：{toDelete.Count} 行");
        if (MessageBox.Show(this, string.Join("\n", lines) + "\n\n是否继续？", "确认保存",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return;

        try
        {
            foreach (var row in toUpdate)
            {
                row.Raw.TryGetValue(_svc.Meta.ChkColumn, out var orig);
                var val = DbService.CheckedValue(orig, row.Checked);
                _svc.UpdatePrdNoChg(row.MpNo, row.Itm, val);
            }
            var deleted = _svc.DeleteRows(toDelete);
            MessageBox.Show(this, $"已更新 {toUpdate.Count} 行，已删除 {deleted} 行", "成功",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            ReloadDropdowns();
            Query();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "保存失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
