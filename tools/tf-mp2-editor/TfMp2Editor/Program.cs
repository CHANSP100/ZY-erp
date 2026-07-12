namespace TfMp2Editor;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        using var login = new LoginForm();
        if (login.ShowDialog() != DialogResult.OK || login.Config is null)
            return;

        var svc = new DbService(login.Config);
        svc.InitMetadata();
        Application.Run(new MainForm(svc, login.Config));
    }
}
