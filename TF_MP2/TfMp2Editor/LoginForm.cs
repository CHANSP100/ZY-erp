namespace TfMp2Editor;

internal sealed class LoginForm : Form
{
    private readonly TextBox _txtServer = new() { Width = 280 };
    private readonly TextBox _txtPort = new() { Width = 280 };
    private readonly TextBox _txtDatabase = new() { Width = 280 };
    private readonly TextBox _txtUser = new() { Width = 280 };
    private readonly TextBox _txtPassword = new() { Width = 280, UseSystemPasswordChar = true };
    private readonly CheckBox _chkRemember = new() { Text = "记住连接信息（密码明文保存在本机）", AutoSize = true, Checked = true };

    public DbConfig? Config { get; private set; }

    public LoginForm()
    {
        Text = $"{AppConstants.AppTitle} - 登录";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(420, 320);
        Font = new Font("Microsoft YaHei UI", 9F);

        var cfg = LoginConfigStore.Load();
        _txtServer.Text = cfg.Server;
        _txtPort.Text = cfg.Port;
        _txtDatabase.Text = cfg.Database;
        _txtUser.Text = cfg.User;
        _txtPassword.Text = cfg.Password;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(16),
            ColumnCount = 2,
            RowCount = 7,
        };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        AddRow(layout, 0, "服务器地址", _txtServer);
        AddRow(layout, 1, "端口", _txtPort);
        AddRow(layout, 2, "数据库名", _txtDatabase);
        AddRow(layout, 3, "用户名", _txtUser);
        AddRow(layout, 4, "密码", _txtPassword);

        var rememberPanel = new Panel { Dock = DockStyle.Fill, Height = 28 };
        rememberPanel.Controls.Add(_chkRemember);
        layout.Controls.Add(rememberPanel, 0, 5);
        layout.SetColumnSpan(rememberPanel, 2);

        var btnPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.RightToLeft,
            WrapContents = false,
            Padding = new Padding(0, 8, 0, 0),
        };
        var btnLogin = new Button { Text = "登录", Width = 80, DialogResult = DialogResult.None };
        var btnTest = new Button { Text = "测试连接", Width = 90 };
        var btnCancel = new Button { Text = "取消", Width = 80, DialogResult = DialogResult.Cancel };
        btnLogin.Click += (_, _) => DoLogin();
        btnTest.Click += (_, _) => DoTest();
        btnPanel.Controls.Add(btnLogin);
        btnPanel.Controls.Add(btnTest);
        btnPanel.Controls.Add(btnCancel);
        layout.Controls.Add(btnPanel, 0, 6);
        layout.SetColumnSpan(btnPanel, 2);

        Controls.Add(layout);
        AcceptButton = btnLogin;
        CancelButton = btnCancel;
    }

    private static void AddRow(TableLayoutPanel layout, int row, string label, Control control)
    {
        layout.Controls.Add(new Label { Text = label, AutoSize = true, Anchor = AnchorStyles.Left }, 0, row);
        layout.Controls.Add(control, 1, row);
    }

    private DbConfig BuildConfig() => new()
    {
        Server = _txtServer.Text.Trim(),
        Port = _txtPort.Text.Trim(),
        Database = _txtDatabase.Text.Trim(),
        User = _txtUser.Text.Trim(),
        Password = _txtPassword.Text,
    };

    private bool ValidateInput()
    {
        if (string.IsNullOrWhiteSpace(_txtServer.Text) ||
            string.IsNullOrWhiteSpace(_txtDatabase.Text) ||
            string.IsNullOrWhiteSpace(_txtUser.Text))
        {
            MessageBox.Show(this, "请填写服务器、数据库名和用户名", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return false;
        }
        return true;
    }

    private void DoTest()
    {
        if (!ValidateInput()) return;
        try
        {
            new DbService(BuildConfig()).TestConnection();
            MessageBox.Show(this, "数据库连接成功", "成功", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "连接失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void DoLogin()
    {
        if (!ValidateInput()) return;
        var cfg = BuildConfig();
        try
        {
            var svc = new DbService(cfg);
            svc.TestConnection();
            svc.InitMetadata();
            if (_chkRemember.Checked)
                LoginConfigStore.Save(cfg);
            Config = cfg;
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "登录失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
