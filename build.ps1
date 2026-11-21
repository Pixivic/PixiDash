param(
    [Parameter(Mandatory)][ValidateSet('Windows','Android')][string]$Target,
    [string]$Output = (Join-Path $PSScriptRoot 'dist'),
    [string]$AndroidSdk = $env:ANDROID_HOME,
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$Keystore
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$outputPath = [IO.Path]::GetFullPath($Output)
$work = Join-Path ([IO.Path]::GetTempPath()) ('PixiDash-' + [Guid]::NewGuid().ToString('N'))
$game = Join-Path $work 'assets/game'
New-Item -ItemType Directory -Path $outputPath,$game -Force | Out-Null

function Invoke-BuildTool([string]$Tool, [string[]]$Arguments) {
    & $Tool @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Tool exited with code $LASTEXITCODE." }
}

try {
    foreach ($file in 'index.html','game.css','game.js','runner.js','crt.js','sprites.js','Pixidash assets') {
        Copy-Item -LiteralPath (Join-Path $root $file) -Destination $game -Recurse
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if ($Target -eq 'Windows') {
        $archive = Join-Path $work 'game.zip'
        [IO.Compression.ZipFile]::CreateFromDirectory($game,$archive)
        $framework = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319'
        Invoke-BuildTool (Join-Path $framework 'csc.exe') @(
            '/nologo', '/target:winexe', '/optimize+',
            '/reference:System.Windows.Forms.dll',
            '/reference:System.IO.Compression.dll',
            '/reference:System.IO.Compression.FileSystem.dll',
            ('/win32icon:' + (Join-Path $game 'Pixidash assets/PixiDash.ico')),
            ('/resource:' + $archive + ',PixiDash.game.zip'),
            ('/out:' + (Join-Path $outputPath 'PixiDash.exe')),
            (Join-Path $root 'platforms/windows/Launcher.cs')
        )
        return
    }

    if (!$AndroidSdk) { $AndroidSdk = $env:ANDROID_SDK_ROOT }
    if (!$AndroidSdk) { $AndroidSdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
    if (!$JavaHome) { $JavaHome = Join-Path $env:ProgramFiles 'Android/Android Studio/jbr' }
    $java = Join-Path $JavaHome 'bin/java.exe'
    $javac = Join-Path $JavaHome 'bin/javac.exe'
    $keytool = Join-Path $JavaHome 'bin/keytool.exe'
    $androidJar = Join-Path $AndroidSdk 'platforms/android-35/android.jar'
    $tools = Join-Path $AndroidSdk 'build-tools/35.0.1'
    $platform = Join-Path $root 'platforms/android'
    $classes = Join-Path $work 'classes'
    $dex = Join-Path $work 'dex'
    $packer = Join-Path $work 'packer'
    $linked = Join-Path $work 'linked.apk'
    $unsigned = Join-Path $work 'unsigned.apk'
    $aligned = Join-Path $work 'aligned.apk'
    $apk = Join-Path $outputPath 'PixiDash-Android.apk'
    New-Item -ItemType Directory -Path $classes,$dex,$packer | Out-Null

    Invoke-BuildTool $javac @('--release','8','-classpath',$androidJar,'-d',$classes,(Join-Path $platform 'GameActivity.java'))
    $classFiles = Get-ChildItem -LiteralPath $classes -Filter '*.class' -Recurse | Select-Object -ExpandProperty FullName
    Invoke-BuildTool $java (@('-cp',(Join-Path $tools 'lib/d8.jar'),'com.android.tools.r8.D8',
        '--lib',$androidJar,'--min-api','24','--output',$dex) + $classFiles)
    $aapt = Join-Path $tools 'aapt2.exe'
    $resources = Join-Path $work 'resources.zip'
    $resourceDir = Join-Path $work 'res'
    Copy-Item -LiteralPath (Join-Path $platform 'res') -Destination $resourceDir -Recurse
    $launcherIcons = Join-Path $root 'platforms/android-legacy/res'
    Get-ChildItem -LiteralPath $launcherIcons -Directory -Filter 'drawable-*' |
        Copy-Item -Destination $resourceDir -Recurse
    Invoke-BuildTool $aapt @('compile','--dir',$resourceDir,'-o',$resources)
    Invoke-BuildTool $aapt @(
        'link','-o',$linked,'-I',$androidJar,'--manifest',(Join-Path $platform 'AndroidManifest.xml'),
        '-A',(Join-Path $work 'assets'),$resources
    )
    Invoke-BuildTool $javac @('-d',$packer,(Join-Path $root 'platforms/android-legacy/tools/PackApk.java'))
    Invoke-BuildTool $java @('-cp',$packer,'PackApk',$linked,(Join-Path $dex 'classes.dex'),$unsigned)
    Invoke-BuildTool (Join-Path $tools 'zipalign.exe') @('-f','4',$unsigned,$aligned)

    $signing = @()
    if (!$Keystore) {
        $signingDir = Join-Path $platform '.signing'
        New-Item -ItemType Directory -Path $signingDir -Force | Out-Null
        $Keystore = Join-Path $signingDir 'sideload.p12'
        if (!(Test-Path -LiteralPath $Keystore)) {
            Invoke-BuildTool $keytool @('-genkeypair','-keystore',$Keystore,'-storetype','PKCS12',
                '-storepass','android','-keypass','android','-alias','pixidash-sideload',
                '-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=PixiDash Sideload')
        }
        $signing = @('--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','pixidash-sideload')
    }
    $signer = Join-Path $tools 'lib/apksigner.jar'
    Invoke-BuildTool $java (@('-jar',$signer,'sign','--v4-signing-enabled','false','--ks',$Keystore,'--out',$apk) + $signing + @($aligned))
    Invoke-BuildTool $java @('-jar',$signer,'verify','--verbose',$apk)
} finally {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    $buildPath = [IO.Path]::GetFullPath($work)
    if ($buildPath.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $buildPath)) {
        Remove-Item -LiteralPath $buildPath -Recurse -Force
    }
}
