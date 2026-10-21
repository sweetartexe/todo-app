Pod::Spec.new do |s|
  s.name           = 'pebble-overlay'
  s.version        = '1.0.0'
  s.summary        = 'Pebble widget bridge'
  s.description    = 'Writes the pet snapshot for the widget and starts a Live Activity'
  s.homepage       = 'https://github.com/sweetartexe/todo-app'
  s.license        = 'MIT'
  s.author         = 'Pebble'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.source_files   = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WidgetKit'
  s.weak_frameworks = 'ActivityKit'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
